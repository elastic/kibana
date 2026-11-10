/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type {
  CloudConnectorCallback,
  CloudConnectorCallbackIdentity,
  CloudConnectorCallbackReceivedValues,
} from '../../common/types/models/provisioning_callback';
import type { CloudConnectorIacState } from '../../common/types/models/cloud_connector';
import type {
  CloudConnectorSOAttributes,
  ProvisioningCallbackSOAttributes,
} from '../types/so_attributes';
import { CloudConnectorCreateError } from '../errors';

import { appContextService } from './app_context';
import { auditLoggingService } from './audit_logging';
import { cloudConnectorService } from './cloud_connector';
import {
  isProvisioningCallbackTokenValid,
  mintProvisioningCallbackToken,
} from './provisioning_callback_token';

/** How long the stack has to call back. Also the lifetime of the token bound to the record. */
export const PROVISIONING_CALLBACK_TTL_MS = 2 * 60 * 60 * 1000;
/**
 * How long a claim is trusted to still be applying its report. Past this, a retry of the same
 * report takes the claim over, so a Kibana that died mid-report does not leave the record stuck.
 */
export const PROVISIONING_CALLBACK_CLAIM_STALE_MS = 60 * 1000;
/** Expired records are swept when a new one is created, this many at a time. */
const EXPIRED_SWEEP_SIZE = 100;

export interface CreateProvisioningCallbackOptions {
  provider: 'aws';
  createdBy?: string;
  spaceId?: string;
  /** Name, account type and template details for the cloud connector created when the stack reports back. */
  identity?: CloudConnectorCallbackIdentity;
}

const IDENTITY_FIELDS: Array<keyof CloudConnectorCallbackIdentity> = [
  'connector_name',
  'account_type',
  'iac_key',
  'iac_blueprint_id',
  'iac_blueprint_version',
];

const CONNECTOR_NAME_MAX_LENGTH = 255;

/** Last path segment of an IAM role ARN, used when the browser has not named the identity yet. */
const roleNameFromArn = (roleArn: string): string => {
  const resource = roleArn.split(':role/')[1] ?? '';
  const name = resource.split('/').pop()?.trim() ?? '';
  return name.slice(0, CONNECTOR_NAME_MAX_LENGTH) || 'aws-workload-identity';
};

const isDuplicateName = (error: unknown): boolean =>
  error instanceof CloudConnectorCreateError && error.message.includes('already exists');

export interface ProvisioningCallbackReceiveInput {
  /** The token the caller presented; undefined when it sent none. */
  token: string | undefined;
  payload: CloudConnectorCallbackReceivedValues;
}

export type ProvisioningCallbackReceiveResult =
  /** Stored now, or an exact replay of what is already stored. */
  | { outcome: 'received'; item: CloudConnectorCallback }
  /** The same report is still being applied by another request; nothing is left for this one. */
  | { outcome: 'receiving'; item: CloudConnectorCallback }
  /** No such record, or the caller's token is not the one bound to it. Indistinguishable on purpose. */
  | { outcome: 'not_found' }
  /** A different payload arrived after the record was already received. */
  | { outcome: 'conflict'; item: CloudConnectorCallback }
  /** Past its expiry, or cancelled by the browser. */
  | { outcome: 'gone' }
  /** Fields are individually well-formed but disagree with each other. */
  | { outcome: 'invalid'; message: string };

/** Audit log entry for each outcome of a report. The `invalid` message comes from the check that failed. */
const REPORT_AUDIT: Record<
  Exclude<ProvisioningCallbackReceiveResult['outcome'], 'invalid'>,
  { message: string; type: string; outcome: string }
> = {
  received: {
    message: 'Provisioning callback report accepted',
    type: 'change',
    outcome: 'success',
  },
  receiving: {
    message: 'Provisioning callback report already being applied',
    type: 'info',
    outcome: 'success',
  },
  not_found: {
    message: 'Provisioning callback report rejected: unknown record or token',
    type: 'denied',
    outcome: 'failure',
  },
  conflict: {
    message: 'Provisioning callback report rejected: different values already received',
    type: 'denied',
    outcome: 'failure',
  },
  gone: {
    message: 'Provisioning callback report rejected: record expired or cancelled',
    type: 'denied',
    outcome: 'failure',
  },
};

const RECEIVED_FIELDS: Array<keyof CloudConnectorCallbackReceivedValues> = [
  'role_arn',
  'stack_arn',
];

const accountIdOfArn = (arn: string): string | undefined => arn.split(':')[4];

const toItem = (
  id: string,
  attributes: ProvisioningCallbackSOAttributes
): CloudConnectorCallback => {
  // The token hash never leaves this service.
  const { token_hash: _tokenHash, ...rest } = attributes;
  return { id, ...rest };
};

/** A claim with no write for longer than the stale window, or with no timestamp at all. */
const isClaimStale = (updatedAt: string | undefined): boolean =>
  !updatedAt || Date.now() - new Date(updatedAt).getTime() > PROVISIONING_CALLBACK_CLAIM_STALE_MS;

/**
 * A live record holding a report nobody is applying: a claim gone stale, or a report released
 * back to pending because its connector could not be made. Both keep the reported values.
 */
const hasUnappliedReport = ({
  attributes,
  updated_at: updatedAt,
}: SavedObject<ProvisioningCallbackSOAttributes>): boolean =>
  (attributes.status === 'receiving' || attributes.status === 'pending') &&
  !!attributes.role_arn &&
  !!attributes.stack_arn &&
  new Date(attributes.expires_at).getTime() > Date.now() &&
  isClaimStale(updatedAt);

/**
 * A claim on a record past its expiry that nobody is applying any more. The poll stops recovering
 * reports once the record has expired, so nothing would ever settle it.
 */
const isAbandonedClaim = ({
  attributes,
  updated_at: updatedAt,
}: SavedObject<ProvisioningCallbackSOAttributes>): boolean =>
  attributes.status === 'receiving' &&
  new Date(attributes.expires_at).getTime() <= Date.now() &&
  isClaimStale(updatedAt);

const isSamePayload = (
  stored: ProvisioningCallbackSOAttributes,
  payload: CloudConnectorCallbackReceivedValues
): boolean => RECEIVED_FIELDS.every((field) => stored[field] === payload[field]);

interface CreatedCloudConnector {
  id: string;
  name: string;
}

class ProvisioningCallbackService {
  private get logger() {
    return appContextService.getLogger().get('provisioningCallback');
  }

  /**
   * Creates a pending record and the token that lets the stack report to it. The token is not a
   * credential of any kind: it is random, bound to this record, its space and its expiry, and
   * only its keyed hash is stored. It is returned exactly once and never logged.
   */
  public async create(
    soClient: SavedObjectsClientContract,
    { provider, createdBy, spaceId, identity = {} }: CreateProvisioningCallbackOptions
  ): Promise<{ item: CloudConnectorCallback; token: string }> {
    const id = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PROVISIONING_CALLBACK_TTL_MS).toISOString();
    const { token, tokenHash } = mintProvisioningCallbackToken({
      callbackId: id,
      spaceId,
      expiresAt,
    });

    const attributes: ProvisioningCallbackSOAttributes = {
      provider,
      status: 'pending',
      token_hash: tokenHash,
      created_at: now.toISOString(),
      ...(createdBy ? { created_by: createdBy } : {}),
      ...(spaceId ? { space_id: spaceId } : {}),
      expires_at: expiresAt,
    };
    for (const field of IDENTITY_FIELDS) {
      if (identity[field] !== undefined) {
        Object.assign(attributes, { [field]: identity[field] });
      }
    }
    auditLoggingService.writeCustomAuditLog({
      message: `User creating provisioning callback [id=${id}]`,
    });

    const so = await soClient.create<ProvisioningCallbackSOAttributes>(
      PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
      attributes,
      { id }
    );
    this.logger.info(
      `Provisioning callback created [id=${id}] [space_id=${spaceId ?? 'default'}] [expires_at=${
        attributes.expires_at
      }]`
    );
    await this.deleteExpired(soClient);

    return { item: toItem(so.id, so.attributes), token };
  }

  /**
   * Deletes records past their expiry, whatever state they ended in. Nothing can act on them
   * any more: their token is refused and the browser has stopped asking. A record whose report
   * is being applied is left for the next sweep. Failures are logged, not raised: the sweep is
   * housekeeping on the way out of a create.
   */
  private async deleteExpired(soClient: SavedObjectsClientContract): Promise<void> {
    const type = PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE;
    try {
      const expired = await soClient.find<ProvisioningCallbackSOAttributes>({
        type,
        filter: `${type}.attributes.expires_at < "${new Date().toISOString()}" and not ${type}.attributes.status: receiving`,
        perPage: EXPIRED_SWEEP_SIZE,
      });
      if (expired.saved_objects.length === 0) {
        return;
      }
      await soClient.bulkDelete(expired.saved_objects.map(({ id }) => ({ type, id })));
      this.logger.debug(`Deleted ${expired.saved_objects.length} expired provisioning callbacks`);
    } catch (error) {
      this.logger.warn(`Could not delete expired provisioning callbacks: ${error.message}`);
    }
  }

  /** The record as stored, with the token hash stripped. Never writes. */
  public async get(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<CloudConnectorCallback | undefined> {
    const so = await this.getSavedObject(soClient, id);
    return so ? toItem(so.id, so.attributes) : undefined;
  }

  /**
   * What the browser polls while it waits for the stack: the record, limited to the space the
   * launch happened in. A report the record holds but nobody is applying is applied on the way,
   * so a Kibana that died mid-report, or a creation that failed once, does not strand it. The
   * caller must hold the privileges that creating the identity needs, since this can create it.
   */
  public async poll(
    soClient: SavedObjectsClientContract,
    id: string,
    spaceId: string
  ): Promise<CloudConnectorCallback | undefined> {
    const so = await this.getSavedObject(soClient, id);
    if (!so || so.attributes.space_id !== spaceId) {
      return undefined;
    }
    return hasUnappliedReport(so) ? this.recover(soClient, so) : toItem(so.id, so.attributes);
  }

  /**
   * Takes over the report a record holds and applies it. When the connector cannot be made the
   * claim is released, as a failed report would be, and the record is handed back pending with
   * its values kept, so a later poll tries again.
   */
  private async recover(
    soClient: SavedObjectsClientContract,
    so: SavedObject<ProvisioningCallbackSOAttributes>
  ): Promise<CloudConnectorCallback> {
    const payload = { role_arn: so.attributes.role_arn!, stack_arn: so.attributes.stack_arn! };
    const taken = await this.claim(soClient, so, payload);
    if (!taken) {
      return toItem(so.id, so.attributes);
    }
    if (!taken.claimedHere) {
      return toItem(so.id, taken.attributes);
    }
    try {
      return await this.apply(soClient, so.id, taken.attributes, payload, taken.version);
    } catch (error) {
      this.logger.warn(
        `Could not apply the stored report of provisioning callback [id=${so.id}]: ${error.message}`
      );
      return toItem(so.id, { ...taken.attributes, status: 'pending' });
    }
  }

  /**
   * Applies the stack's report. A caller without the record's own token gets the same answer as
   * for a missing record. The token is checked against the record as stored, so a record whose
   * id, space or expiry was altered rejects its own token.
   *
   * The report is claimed with a version-guarded update before the cloud connector is created,
   * and the connector takes the record's id, so concurrent or retried reports converge on one
   * identity: a second report either loses the claim and is judged against the stored values,
   * or finds the connector the first one created.
   */
  public async receive(
    soClient: SavedObjectsClientContract,
    id: string,
    input: ProvisioningCallbackReceiveInput
  ): Promise<ProvisioningCallbackReceiveResult> {
    let result: ProvisioningCallbackReceiveResult;
    try {
      result = await this.judgeReport(soClient, id, input);
    } catch (error) {
      this.auditReport(id, input.payload, {
        message: 'Provisioning callback report could not be applied',
        type: 'error',
        outcome: 'failure',
        error,
      });
      throw error;
    }
    if (result.outcome === 'not_found') {
      // The caller was not admitted, so nothing it sent is trusted enough to be recorded.
      this.auditReport(undefined, undefined, REPORT_AUDIT.not_found);
    } else if (result.outcome === 'invalid') {
      this.auditReport(id, input.payload, {
        message: `Provisioning callback report rejected: ${result.message}`,
        type: 'denied',
        outcome: 'failure',
      });
    } else {
      this.auditReport(id, input.payload, REPORT_AUDIT[result.outcome]);
    }
    return result;
  }

  /**
   * The caller's values go in structured fields, never in the message, so a report cannot
   * write its own text into the audit log. The token is never written.
   */
  private auditReport(
    id: string | undefined,
    payload: CloudConnectorCallbackReceivedValues | undefined,
    {
      message,
      type,
      outcome,
      error,
    }: { message: string; type: string; outcome: string; error?: Error }
  ) {
    auditLoggingService.writeCustomAuditLog({
      message,
      event: {
        action: 'provisioning_callback_report',
        category: ['web'],
        type: [type],
        outcome,
      },
      ...(id
        ? { kibana: { saved_object: { type: PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE, id } } }
        : {}),
      ...(payload ? { labels: { role_arn: payload.role_arn, stack_arn: payload.stack_arn } } : {}),
      ...(error ? { error: { message: error.message } } : {}),
    });
  }

  private async judgeReport(
    soClient: SavedObjectsClientContract,
    id: string,
    { token, payload }: ProvisioningCallbackReceiveInput
  ): Promise<ProvisioningCallbackReceiveResult> {
    const so = await this.getSavedObject(soClient, id);
    if (
      !so ||
      !isProvisioningCallbackTokenValid(
        token,
        { callbackId: so.id, spaceId: so.attributes.space_id, expiresAt: so.attributes.expires_at },
        so.attributes.token_hash
      )
    ) {
      return { outcome: 'not_found' };
    }

    if (accountIdOfArn(payload.role_arn) !== accountIdOfArn(payload.stack_arn)) {
      return {
        outcome: 'invalid',
        message: 'role_arn and stack_arn must be in the same AWS account',
      };
    }

    let { attributes, version } = so;
    let updatedAt = so.updated_at;
    let claimedHere = false;
    if (attributes.status === 'pending') {
      if (new Date(attributes.expires_at).getTime() <= Date.now()) {
        return { outcome: 'gone' };
      }
      const claimed = await this.claim(soClient, so, payload);
      if (!claimed) {
        return { outcome: 'not_found' };
      }
      ({ attributes, version, updatedAt, claimedHere } = claimed);
    }

    if (attributes.status === 'cancelled') {
      return { outcome: 'gone' };
    }

    if (!isSamePayload(attributes, payload)) {
      // A different report is a conflict, whether the first one has finished or not.
      return { outcome: 'conflict', item: toItem(so.id, attributes) };
    }

    if (attributes.status === 'received') {
      // A retry of the same report gets the same result.
      return { outcome: 'received', item: toItem(so.id, attributes) };
    }

    if (!claimedHere) {
      // Someone else holds the claim. Only the holder applies the report, so a failure on one
      // side cannot roll back what the other is doing. A claim nobody has touched for a while
      // belongs to a request that died, and is taken over with a fresh version of its own.
      if (!isClaimStale(updatedAt)) {
        return { outcome: 'receiving', item: toItem(so.id, attributes) };
      }
      const taken = await this.claim(soClient, { ...so, attributes, version }, payload);
      if (!taken) {
        return { outcome: 'not_found' };
      }
      if (!taken.claimedHere) {
        return { outcome: 'receiving', item: toItem(so.id, taken.attributes) };
      }
      ({ attributes, version } = taken);
    }

    const item = await this.apply(soClient, so.id, attributes, payload, version);
    return { outcome: 'received', item };
  }

  /**
   * Makes the connector for a claim this attempt holds and marks the record received. When no
   * connector could be made the claim is released, so a retry of the report or a cancel from
   * the browser is not stuck behind a claim nobody is applying, and the error is rethrown.
   */
  private async apply(
    soClient: SavedObjectsClientContract,
    id: string,
    attributes: ProvisioningCallbackSOAttributes,
    payload: CloudConnectorCallbackReceivedValues,
    version: string | undefined
  ): Promise<CloudConnectorCallback> {
    let connector: CreatedCloudConnector;
    try {
      connector = await this.ensureCloudConnector(id, attributes, payload);
    } catch (error) {
      await this.releaseClaim(soClient, id, version);
      throw error;
    }

    const item = await this.finish(soClient, id, attributes, connector, version);
    this.logger.info(
      `Provisioning callback received [id=${id}] [cloud_connector_id=${connector.id}]`
    );
    return item;
  }

  /**
   * Marks the record received for the connector made from it. The token has nothing left to do
   * from here: a repeat of the same report is answered the same way, anything else is refused.
   * With a version, the write only lands on the claim this attempt holds; when another attempt
   * took the claim over and finished first, its result is returned instead. A cancel that landed
   * while the connector was being made is overridden: the identity exists, so the record says so.
   */
  private async finish(
    soClient: SavedObjectsClientContract,
    id: string,
    attributes: ProvisioningCallbackSOAttributes,
    connector: CreatedCloudConnector,
    version?: string
  ): Promise<CloudConnectorCallback> {
    const update: Partial<ProvisioningCallbackSOAttributes> = {
      status: 'received',
      received_at: new Date().toISOString(),
      connector_name: connector.name,
      cloud_connector_id: connector.id,
    };
    try {
      await soClient.update<ProvisioningCallbackSOAttributes>(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        id,
        update,
        ...(version ? [{ version }] : [])
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
      const current = await this.getSavedObject(soClient, id);
      if (current?.attributes.status === 'cancelled') {
        this.logger.info(
          `Provisioning callback [id=${id}] was cancelled while its identity was being created; marking it received [cloud_connector_id=${connector.id}]`
        );
        return this.finish(soClient, id, current.attributes, connector);
      }
      if (current) {
        return toItem(current.id, current.attributes);
      }
    }

    auditLoggingService.writeCustomAuditLog({
      message: 'Provisioning callback received, cloud connector created',
      event: {
        action: 'provisioning_callback_received',
        category: ['database'],
        type: ['creation'],
        outcome: 'success',
      },
      kibana: { saved_object: { type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, id: connector.id } },
      labels: {
        provisioning_callback_id: id,
        role_arn: attributes.role_arn,
        stack_arn: attributes.stack_arn,
      },
    });

    return toItem(id, { ...attributes, ...update });
  }

  /**
   * Puts the record back to pending, but only if it is still as this attempt last saw it: a
   * concurrent attempt with the same report may have finished it in the meantime, and its
   * progress must not be rolled back.
   */
  private async releaseClaim(
    soClient: SavedObjectsClientContract,
    id: string,
    version: string | undefined
  ): Promise<void> {
    try {
      await soClient.update<ProvisioningCallbackSOAttributes>(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        id,
        { status: 'pending' },
        { version }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        return;
      }
      this.logger.warn(
        `Provisioning callback [id=${id}] could not be released after a failed report: ${error.message}`
      );
    }
  }

  /**
   * Retires a record the browser no longer waits on, so its token is refused. A record the stack has
   * already reported to is returned as it is, so the caller can pick up the identity instead of
   * creating one by hand. A report that made its connector but never got marked received is
   * finished here. A report left behind on a record that has since expired is retired with it:
   * the poll no longer recovers it, so the browser would otherwise wait for good. The connector
   * is looked up again once the record is cancelled, in case that report was only slow; a
   * connector that lands later still turns the record received, after the caller was answered.
   */
  public async cancel(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<CloudConnectorCallback | undefined> {
    const so = await this.getSavedObject(soClient, id);
    if (!so) {
      return undefined;
    }
    const { attributes, version } = so;
    const spaceClient = appContextService.getInternalUserSOClientForSpaceId(attributes.space_id);
    if (attributes.status === 'receiving') {
      const connector = await this.findCloudConnector(spaceClient, so.id);
      if (connector) {
        return this.finish(soClient, so.id, attributes, connector);
      }
      if (!isAbandonedClaim(so)) {
        return toItem(so.id, attributes);
      }
    } else if (attributes.status !== 'pending') {
      return toItem(so.id, attributes);
    }

    const update: Partial<ProvisioningCallbackSOAttributes> = { status: 'cancelled' };
    let cancelledVersion: string | undefined;
    try {
      ({ version: cancelledVersion } = await soClient.update<ProvisioningCallbackSOAttributes>(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        so.id,
        update,
        { version }
      ));
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
      // A report claimed the record first; hand back what it is doing.
      const claimed = await this.getSavedObject(soClient, id);
      return claimed ? toItem(claimed.id, claimed.attributes) : undefined;
    }
    if (attributes.status === 'receiving') {
      // A claim that looked abandoned may only have been slow, and its connector can land while
      // the record is being cancelled. Report the identity rather than leave it behind a record
      // that denies it. The write is guarded, so a report that got there first is not redone.
      const connector = await this.findCloudConnector(spaceClient, so.id);
      if (connector) {
        return this.finish(soClient, so.id, attributes, connector, cancelledVersion);
      }
      this.logger.warn(
        `Provisioning callback [id=${so.id}] expired while its report was being applied; no identity was created for it`
      );
    }
    this.logger.info(`Provisioning callback cancelled [id=${so.id}]`);

    auditLoggingService.writeCustomAuditLog({
      message: `User cancelling provisioning callback [id=${so.id}]`,
    });

    return toItem(so.id, { ...attributes, ...update });
  }

  /**
   * Moves a record to `receiving` with the reported values, guarded by the record's version.
   * When another request got there first, returns what it stored instead, with `claimedHere`
   * false. The version returned is the one this attempt last saw, for a guarded release later.
   */
  private async claim(
    soClient: SavedObjectsClientContract,
    so: SavedObject<ProvisioningCallbackSOAttributes>,
    payload: CloudConnectorCallbackReceivedValues
  ): Promise<
    | {
        attributes: ProvisioningCallbackSOAttributes;
        version: string | undefined;
        updatedAt: string | undefined;
        claimedHere: boolean;
      }
    | undefined
  > {
    const update: Partial<ProvisioningCallbackSOAttributes> = {
      status: 'receiving',
      role_arn: payload.role_arn,
      stack_arn: payload.stack_arn,
    };
    try {
      const updated = await soClient.update<ProvisioningCallbackSOAttributes>(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        so.id,
        update,
        { version: so.version }
      );
      return {
        attributes: { ...so.attributes, ...update },
        version: updated.version,
        updatedAt: updated.updated_at,
        claimedHere: true,
      };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
      const current = await this.getSavedObject(soClient, so.id);
      return current
        ? {
            attributes: current.attributes,
            version: current.version,
            updatedAt: current.updated_at,
            claimedHere: false,
          }
        : undefined;
    }
  }

  /**
   * The connector for this record, created if it does not exist yet. It takes the record's id,
   * so a retry after a failed finalisation, or a concurrent report, finds the one already made
   * instead of creating another.
   */
  private async ensureCloudConnector(
    callbackId: string,
    attributes: ProvisioningCallbackSOAttributes,
    payload: CloudConnectorCallbackReceivedValues
  ): Promise<CreatedCloudConnector> {
    const spaceClient = appContextService.getInternalUserSOClientForSpaceId(attributes.space_id);
    const existing = await this.findCloudConnector(spaceClient, callbackId);
    if (existing) {
      return existing;
    }
    try {
      return await this.createCloudConnector(spaceClient, callbackId, attributes, payload);
    } catch (error) {
      // A concurrent report may have created it between the lookup and the create.
      const created = await this.findCloudConnector(spaceClient, callbackId);
      if (created) {
        return created;
      }
      throw error;
    }
  }

  private async findCloudConnector(
    spaceClient: SavedObjectsClientContract,
    id: string
  ): Promise<CreatedCloudConnector | undefined> {
    try {
      const so = await spaceClient.get<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        id
      );
      return { id: so.id, name: so.attributes.name };
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Creates the federated identity in the space the launch happened in, named after the stored
   * name or else the role. A taken name gets a short suffix, so the report still creates an
   * identity.
   */
  private async createCloudConnector(
    spaceClient: SavedObjectsClientContract,
    callbackId: string,
    attributes: ProvisioningCallbackSOAttributes,
    payload: CloudConnectorCallbackReceivedValues
  ): Promise<CreatedCloudConnector> {
    const preferred =
      attributes.connector_name?.trim().slice(0, CONNECTOR_NAME_MAX_LENGTH) ||
      roleNameFromArn(payload.role_arn);

    const iac: CloudConnectorIacState = { iac_deployment_id: payload.stack_arn };
    if (attributes.iac_key !== undefined) {
      iac.iac_key = attributes.iac_key;
    }
    if (attributes.iac_blueprint_id !== undefined) {
      iac.iac_blueprint_id = attributes.iac_blueprint_id;
    }
    if (attributes.iac_blueprint_version !== undefined) {
      iac.iac_blueprint_version = attributes.iac_blueprint_version;
    }

    const create = (name: string) =>
      cloudConnectorService.create(
        spaceClient,
        {
          name,
          cloudProvider: 'aws',
          ...(attributes.account_type ? { accountType: attributes.account_type } : {}),
          vars: { role_arn: { type: 'text', value: payload.role_arn } },
          ...iac,
        },
        { id: callbackId }
      );

    try {
      return await create(preferred);
    } catch (error) {
      if (!isDuplicateName(error)) {
        throw error;
      }
      const suffix = ` ${callbackId.slice(0, 8)}`;
      return create(`${preferred.slice(0, CONNECTOR_NAME_MAX_LENGTH - suffix.length)}${suffix}`);
    }
  }

  private async getSavedObject(soClient: SavedObjectsClientContract, id: string) {
    try {
      return await soClient.get<ProvisioningCallbackSOAttributes>(
        PROVISIONING_CALLBACK_SAVED_OBJECT_TYPE,
        id
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }
}

export const provisioningCallbackService = new ProvisioningCallbackService();
