/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import type { Logger, SavedObjectsClientContract, SavedObjectsFindOptions } from '@kbn/core/server';
import { isSavedObjectErrorResult, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import type {
  ServiceAccountWorkloadBinder,
  ServiceAccountWorkloadBinding,
} from '@kbn/core-security-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';

import type { WorkloadBindingAttributes, WorkloadBindingCoordinates } from './binding_saved_object';
import {
  getWorkloadBindingId,
  SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
} from './binding_saved_object';
import { getDetailedErrorMessage, toErrorStatusCode } from '../../errors';

/** Pages of this size are walked when listing every workload bound to a service account. */
const FIND_PAGE_SIZE = 100;

const BOUND_AT_FIELD = `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.boundAt`;
const BINDING_KEY_FIELD = `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.bindingKey`;
const PLUGIN_ID_FIELD = `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.pluginId`;
const WORKLOAD_TYPE_FIELD = `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.workloadType`;
const BINDER_TYPE_FIELD = `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.boundBy.type`;
const SERVICE_ACCOUNT_ID_FIELD = `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.serviceAccountId`;

/**
 * How many buckets each terms aggregation in the summary returns. It is well above the number of
 * plugins, workload types and binder types today, so no bucket is dropped.
 */
const SUMMARY_TERMS_SIZE = 100;

/** The number of bindings for one workload type of one plugin. */
export interface WorkloadTypeBindingCount {
  pluginId: string;
  workloadType: string;
  count: number;
}

/** Every binding in every space, counted for usage telemetry. */
export interface WorkloadBindingSummary {
  /** Workloads bound to a service account, across every plugin and space. */
  total: number;
  /** Accounts with at least one binding. */
  serviceAccounts: number;
  /** Binding counts for each workload type of each plugin. */
  byWorkload: WorkloadTypeBindingCount[];
  /** Binding counts by who bound the workload: a user, an API key or a service account. */
  byBinderType: { user: number; api_key: number; service_account: number };
}

type StringTermsAggregate<SubAggregations = {}> = estypes.AggregationsTermsAggregateBase<
  estypes.AggregationsStringTermsBucketKeys & SubAggregations
>;

interface WorkloadBindingSummaryAggregations {
  byPlugin: StringTermsAggregate<{ byWorkloadType: StringTermsAggregate }>;
  byBinderType: StringTermsAggregate;
  serviceAccounts: estypes.AggregationsCardinalityAggregate;
}

type BinderType = ServiceAccountWorkloadBinder['type'];
const BINDER_TYPES: readonly string[] = [
  'user',
  'api_key',
  'service_account',
] as const satisfies readonly BinderType[];
const isBinderType = (value: string): value is BinderType => BINDER_TYPES.includes(value);

const toBuckets = <Bucket>(
  aggregate: estypes.AggregationsTermsAggregateBase<Bucket> | undefined
): Bucket[] => {
  const buckets = aggregate?.buckets;
  return Array.isArray(buckets) ? buckets : [];
};

/** One page of the stale binding sweep, unverified. */
export interface WorkloadBindingSweepPage {
  bindings: ServiceAccountWorkloadBinding[];
  /** The binding key of the last binding on the page, to resume after. Absent when it is empty. */
  nextAfterKey?: string;
}

/**
 * What re-reading a binding just before acting on it found.
 *
 * - `verified`: it passed integrity verification and still names the expected account and time.
 * - `integrity_failed`: it failed integrity verification.
 * - `changed`: it was rebound since it was read.
 * - `absent`: it is gone.
 */
export type WorkloadBindingVerification = 'verified' | 'integrity_failed' | 'changed' | 'absent';

export interface WorkloadBindingStoreOptions {
  client: SavedObjectsClientContract;
  encryptedClient: EncryptedSavedObjectsClient;
  isEncryptionError: (error: Error) => boolean;
  logger: Logger;
}

const toBinding = (attributes: WorkloadBindingAttributes): ServiceAccountWorkloadBinding => ({
  pluginId: attributes.pluginId,
  workloadType: attributes.workloadType,
  workloadId: attributes.workloadId,
  serviceAccountId: attributes.serviceAccountId,
  spaceId: attributes.spaceId,
  boundBy: attributes.boundBy,
  boundAt: attributes.boundAt,
});

/** The outcome of writing one binding in a bulk write. */
export type WorkloadBindingWriteOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: Boom.Boom };

/**
 * A per-object saved objects error, as the bulk APIs report it, as the error it stands for. Most
 * are reported as plain `{ message, statusCode }`, but some are the original error itself, such as
 * a failed create schema validation. Those are kept as they are, so their status and their saved
 * objects error type survive for a caller that checks them.
 */
const toBoom = (error: { message: string; statusCode: number }): Boom.Boom => {
  if (Boom.isBoom(error)) {
    return error;
  }

  const { message, statusCode } = error;
  return new Boom.Boom(message, { statusCode: toErrorStatusCode(statusCode) });
};

/**
 * The one space a bulk write addresses. A bulk write is one request to one namespace, so bindings
 * of several spaces cannot share it.
 */
const getSingleSpaceId = (bindings: ReadonlyArray<{ spaceId: string }>): string => {
  const [{ spaceId }] = bindings;
  if (bindings.some((binding) => binding.spaceId !== spaceId)) {
    throw new Error('A bulk write of workload bindings must address a single space.');
  }
  return spaceId;
};

/**
 * Persistence for workload bindings.
 */
export class WorkloadBindingStore {
  private readonly client: SavedObjectsClientContract;
  private readonly encryptedClient: EncryptedSavedObjectsClient;
  private readonly isEncryptionError: (error: Error) => boolean;
  private readonly logger: Logger;

  constructor({ client, encryptedClient, isEncryptionError, logger }: WorkloadBindingStoreOptions) {
    this.client = client;
    this.encryptedClient = encryptedClient;
    this.isEncryptionError = isEncryptionError;
    this.logger = logger;
  }

  /**
   * Writes the bindings, replacing any existing one for the same coordinates. Re-binding a
   * workload to a different service account is the same write as binding it for the first time.
   * Every binding must be in the same space, since they are written with one request.
   *
   * Resolves one outcome per binding, in the order given: a binding that could not be written
   * fails on its own and leaves the others written. Rejects when the write as a whole fails. A
   * rejection does not always mean nothing was written: a request that timed out or lost its
   * connection may have written some, all or none of the bindings.
   */
  async bulkSet(
    attributes: ReadonlyArray<Omit<WorkloadBindingAttributes, 'bindingKey'>>
  ): Promise<Array<WorkloadBindingWriteOutcome<ServiceAccountWorkloadBinding>>> {
    if (attributes.length === 0) {
      return [];
    }

    const { saved_objects: savedObjects } = await this.client.bulkCreate<WorkloadBindingAttributes>(
      attributes.map((binding) => {
        const id = getWorkloadBindingId(binding);
        return {
          type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
          id,
          attributes: { ...binding, bindingKey: id },
        };
      }),
      { namespace: getSingleSpaceId(attributes), overwrite: true, refresh: 'wait_for' }
    );

    return attributes.map((binding, index) => {
      const result = savedObjects[index];
      if (!result) {
        return { ok: false, error: Boom.internal('The binding write reported no result.') };
      }
      return isSavedObjectErrorResult(result)
        ? { ok: false, error: toBoom(result.error) }
        : { ok: true, value: toBinding(binding) };
    });
  }

  /**
   * Removes the bindings, which must all be in the same space. Resolves one outcome per binding,
   * in the order given, with whether there was a binding to remove: removing one that is already
   * gone is not an error, since the caller's desired end state has been reached either way.
   * Rejects when the delete as a whole fails. As with {@link bulkSet}, a rejection after the
   * request was sent may have removed some, all or none of the bindings.
   */
  async bulkDelete(
    coordinates: readonly WorkloadBindingCoordinates[]
  ): Promise<Array<WorkloadBindingWriteOutcome<boolean>>> {
    if (coordinates.length === 0) {
      return [];
    }

    const { statuses } = await this.client.bulkDelete(
      coordinates.map((binding) => ({
        type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        id: getWorkloadBindingId(binding),
      })),
      { namespace: getSingleSpaceId(coordinates), refresh: 'wait_for' }
    );

    return coordinates.map((_binding, index) => {
      const status = statuses[index];
      if (status?.success) {
        return { ok: true, value: true };
      }
      if (status?.error?.statusCode === 404) {
        return { ok: true, value: false };
      }
      return {
        ok: false,
        error: status?.error
          ? toBoom(status.error)
          : Boom.internal('The binding delete reported no status.'),
      };
    });
  }

  /**
   * Removes the binding. Resolves `false` when there was nothing to remove, so a repeated unbind
   * is not an error: the caller's desired end state has been reached either way.
   */
  async delete(coordinates: WorkloadBindingCoordinates): Promise<boolean> {
    try {
      await this.client.delete(
        SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        getWorkloadBindingId(coordinates),
        { namespace: coordinates.spaceId, refresh: 'wait_for' }
      );
      return true;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return false;
      }
      throw e;
    }
  }

  /**
   * Reads the binding and verifies its integrity, resolving `null` when the workload has none.
   *
   * Throws when the stored document fails verification, which means its attributes were modified
   * outside of Kibana — callers must treat this as a refusal and never fall back to minting a
   * credential.
   */
  async getVerified(
    coordinates: WorkloadBindingCoordinates
  ): Promise<ServiceAccountWorkloadBinding | null> {
    const id = getWorkloadBindingId(coordinates);

    let attributes: WorkloadBindingAttributes;
    try {
      ({ attributes } =
        await this.encryptedClient.getDecryptedAsInternalUser<WorkloadBindingAttributes>(
          SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
          id,
          { namespace: coordinates.spaceId }
        ));
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return null;
      }

      if (e instanceof Error && this.isEncryptionError(e)) {
        this.logger.error(
          `Service account workload binding [${id}] failed integrity verification: ${getDetailedErrorMessage(
            e
          )}`
        );
        throw Boom.forbidden(
          'The service account binding for this workload failed integrity verification.'
        );
      }

      throw e;
    }

    // Decryption skips an encrypted attribute that is absent rather than failing, so a document
    // whose canary was stripped would "decrypt" without any of its other attributes having been
    // authenticated. The canary's presence is what proves the authentication tag was checked.
    if (typeof attributes.canary !== 'string' || attributes.canary.length === 0) {
      this.logger.error(
        `Service account workload binding [${id}] failed integrity verification: the canary is missing.`
      );
      throw Boom.forbidden(
        'The service account binding for this workload failed integrity verification.'
      );
    }

    // The coordinates are authenticated data, so a mismatch cannot come from tampering — it would
    // mean this ID was derived from different coordinates than the ones stored under it.
    const mismatches = (['pluginId', 'workloadType', 'workloadId', 'spaceId'] as const)
      .filter((coordinate) => attributes[coordinate] !== coordinates[coordinate])
      .map(
        (coordinate) =>
          `${coordinate}: expected [${coordinates[coordinate]}], got [${attributes[coordinate]}]`
      );
    if (mismatches.length > 0) {
      this.logger.error(
        `Service account workload binding [${id}] does not describe the workload it was looked up by: ${mismatches.join(
          '; '
        )}`
      );
      throw Boom.forbidden('The service account binding for this workload is inconsistent.');
    }

    return toBinding(attributes);
  }

  /**
   * Lists every workload bound to the given service account, across operations and spaces.
   *
   * Deliberately not integrity-verified: this answers "what would break if this service account
   * went away?" over potentially many bindings. Anything acting on the result — deleting a service
   * account because nothing appears to use it, say — must re-read the bindings it cares about
   * through {@link getVerified}.
   */
  async findByServiceAccountId(serviceAccountId: string): Promise<ServiceAccountWorkloadBinding[]> {
    const bindings: ServiceAccountWorkloadBinding[] = [];

    const finder = this.client.createPointInTimeFinder<WorkloadBindingAttributes>({
      type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
      perPage: FIND_PAGE_SIZE,
      // TODO(legrego): This will need a more refined approach once service accounts
      // support fine-grained authorization checks.
      namespaces: [ALL_NAMESPACES_STRING],
      filter: nodeBuilder.is(
        `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.serviceAccountId`,
        serviceAccountId
      ),
    });

    try {
      for await (const { saved_objects: savedObjects } of finder.find()) {
        bindings.push(...savedObjects.map(({ attributes }) => toBinding(attributes)));
      }
    } finally {
      await finder.close();
    }

    return bindings;
  }

  /**
   * Counts the workloads bound to each of the given service accounts, across operations and spaces.
   * An account with no bindings is left out of the result.
   *
   * Not integrity-verified, for the same reason as {@link findByServiceAccountId}. The count is
   * for display only.
   */
  async countByServiceAccountIds(serviceAccountIds: string[]): Promise<Map<string, number>> {
    if (serviceAccountIds.length === 0) {
      return new Map();
    }

    const field = `${SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE}.attributes.serviceAccountId`;
    const { aggregations } = await this.client.find<
      WorkloadBindingAttributes,
      {
        byServiceAccount: estypes.AggregationsTermsAggregateBase<estypes.AggregationsStringTermsBucketKeys>;
      }
    >({
      type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
      perPage: 0,
      // TODO(legrego): This will need a more refined approach once service accounts
      // support fine-grained authorization checks.
      namespaces: [ALL_NAMESPACES_STRING],
      filter: nodeBuilder.or(serviceAccountIds.map((id) => nodeBuilder.is(field, id))),
      // `include` and `size` cover every id, so each count is exact.
      aggs: {
        byServiceAccount: {
          terms: { field, include: serviceAccountIds, size: serviceAccountIds.length },
        },
      },
    });

    const buckets = aggregations?.byServiceAccount.buckets;
    return new Map(
      (Array.isArray(buckets) ? buckets : []).map(({ key, doc_count: count }) => [
        String(key),
        count,
      ])
    );
  }

  /**
   * Summarizes every binding in every space, for usage telemetry. Not integrity-verified, so the
   * counts can include bindings that would fail verification.
   */
  async summarize(): Promise<WorkloadBindingSummary> {
    const { aggregations } = await this.client.find<
      WorkloadBindingAttributes,
      WorkloadBindingSummaryAggregations
    >({
      type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
      perPage: 0,
      namespaces: [ALL_NAMESPACES_STRING],
      aggs: {
        byPlugin: {
          terms: { field: PLUGIN_ID_FIELD, size: SUMMARY_TERMS_SIZE },
          aggs: {
            byWorkloadType: { terms: { field: WORKLOAD_TYPE_FIELD, size: SUMMARY_TERMS_SIZE } },
          },
        },
        byBinderType: { terms: { field: BINDER_TYPE_FIELD, size: SUMMARY_TERMS_SIZE } },
        // The highest threshold ES allows. Counts below it are close to exact.
        serviceAccounts: {
          cardinality: { field: SERVICE_ACCOUNT_ID_FIELD, precision_threshold: 40_000 },
        },
      },
    });

    const pluginBuckets = toBuckets(aggregations?.byPlugin);
    const byWorkload = pluginBuckets.flatMap(({ key: pluginId, byWorkloadType }) =>
      toBuckets(byWorkloadType).map(
        ({ key: workloadType, doc_count: count }): WorkloadTypeBindingCount => ({
          pluginId: String(pluginId),
          workloadType: String(workloadType),
          count,
        })
      )
    );

    const byBinderType: WorkloadBindingSummary['byBinderType'] = {
      user: 0,
      api_key: 0,
      service_account: 0,
    };
    for (const { key, doc_count: count } of toBuckets(aggregations?.byBinderType)) {
      const binderType = String(key);
      if (isBinderType(binderType)) {
        byBinderType[binderType] = count;
      }
    }

    return {
      // From the buckets, not the hit total, which stops at 10,000.
      total:
        pluginBuckets.reduce((sum, { doc_count: count }) => sum + count, 0) +
        (aggregations?.byPlugin.sum_other_doc_count ?? 0),
      serviceAccounts: aggregations?.serviceAccounts.value ?? 0,
      byWorkload,
      byBinderType,
    };
  }

  /**
   * Reads one page of the stale binding sweep: bindings made before `cutoff`, ordered by their
   * binding key and starting after `afterKey`. Not integrity-verified. Each page is its own query,
   * so nothing is held open between pages or runs.
   */
  async findPageForSweep({
    cutoff,
    afterKey,
    size,
  }: {
    cutoff: string;
    afterKey?: string;
    size: number;
  }): Promise<WorkloadBindingSweepPage> {
    // Bindings without a key would sort last and end the pass without a key to resume from.
    // `findUnkeyedPage` reads those instead.
    const filter = nodeBuilder.and([
      nodeBuilder.range(BOUND_AT_FIELD, 'lt', cutoff),
      fromKueryExpression(`${BINDING_KEY_FIELD}: *`),
      ...(afterKey !== undefined ? [nodeBuilder.range(BINDING_KEY_FIELD, 'gt', afterKey)] : []),
    ]);

    const found = await this.findForSweep({ filter, size, sortField: 'bindingKey' });

    // The stored key, not one derived from the coordinates: it is what the page was sorted on, so
    // resuming after it always moves forward.
    return {
      bindings: found.map(toBinding),
      nextAfterKey: found.at(-1)?.bindingKey,
    };
  }

  /**
   * Reads up to `size` bindings made before `cutoff` that have no binding key, which an older
   * node may still write during an upgrade. Not integrity-verified.
   */
  async findUnkeyedPage({
    cutoff,
    size,
  }: {
    cutoff: string;
    size: number;
  }): Promise<ServiceAccountWorkloadBinding[]> {
    const filter = nodeBuilder.and([
      nodeBuilder.range(BOUND_AT_FIELD, 'lt', cutoff),
      fromKueryExpression(`not ${BINDING_KEY_FIELD}: *`),
    ]);
    const found = await this.findForSweep({ filter, size, sortField: 'boundAt' });
    return found.map(toBinding);
  }

  /**
   * Writes the binding key onto a binding that lacks one, so the sweep can reach it. Resolves
   * `false` when the binding is gone.
   *
   * A partial update is safe here: the key is neither encrypted nor authenticated, so it leaves
   * the canary's authentication intact. The key is derived from the coordinates, so a rebind that
   * races this write ends with the same key.
   */
  async setBindingKey(coordinates: WorkloadBindingCoordinates): Promise<boolean> {
    const id = getWorkloadBindingId(coordinates);
    try {
      await this.client.update<Pick<WorkloadBindingAttributes, 'bindingKey'>>(
        SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
        id,
        { bindingKey: id },
        { namespace: coordinates.spaceId }
      );
      return true;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return false;
      }
      throw e;
    }
  }

  /**
   * Re-reads a binding, verified, to check that it is still the one that was read before. Errors
   * other than a failed integrity check propagate, since they say nothing about the binding.
   */
  async verifyUnchanged(
    coordinates: WorkloadBindingCoordinates,
    expected: Pick<ServiceAccountWorkloadBinding, 'serviceAccountId' | 'boundAt'>
  ): Promise<WorkloadBindingVerification> {
    let binding: ServiceAccountWorkloadBinding | null;
    try {
      binding = await this.getVerified(coordinates);
    } catch (e) {
      if (Boom.isBoom(e) && e.output.statusCode === 403) {
        return 'integrity_failed';
      }
      throw e;
    }

    if (!binding) {
      return 'absent';
    }

    return binding.serviceAccountId === expected.serviceAccountId &&
      binding.boundAt === expected.boundAt
      ? 'verified'
      : 'changed';
  }

  private async findForSweep({
    filter,
    size,
    sortField,
  }: {
    filter: SavedObjectsFindOptions['filter'];
    size: number;
    sortField: string;
  }): Promise<WorkloadBindingAttributes[]> {
    const { saved_objects: savedObjects } = await this.client.find<WorkloadBindingAttributes>({
      type: SERVICE_ACCOUNT_WORKLOAD_BINDING_TYPE,
      perPage: size,
      namespaces: [ALL_NAMESPACES_STRING],
      filter,
      sortField,
      sortOrder: 'asc',
    });

    return savedObjects.map(({ attributes }) => attributes);
  }
}
