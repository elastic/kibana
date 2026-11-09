/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers, isSavedObjectErrorResult } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';

import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  AWS_ONBOARDING_PACKAGE_NAMES,
  CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../common/constants';
import type {
  CloudOnboardingDeployment,
  CreateCloudOnboardingDeploymentInput,
  UpdateCloudOnboardingDeploymentInput,
} from '../../common/types/models/cloud_onboarding_deployment';
import type {
  CloudOnboardingDeploymentSOAttributes,
  PackagePolicySOAttributes,
} from '../types/so_attributes';

import { appContextService } from './app_context';
import { auditLoggingService } from './audit_logging';
import { getPackagePolicySavedObjectType } from './package_policy';

const CLOUD_ONBOARDING_DEPLOYMENT_LIMIT = 100;
// Distinct package names to count: far more than any provider's onboarding covers.
const MAX_COUNTED_PACKAGES = 1000;

const toDeployment = (
  so: SavedObject<CloudOnboardingDeploymentSOAttributes>
): CloudOnboardingDeployment => ({
  id: so.id,
  ...so.attributes,
  ...(so.updated_at ? { updatedAt: so.updated_at } : {}),
});

export interface ListCloudOnboardingDeploymentsOptions {
  packageName?: string;
  provider?: string;
  page?: number;
  perPage?: number;
}

/**
 * The package policies a deployment manages: one per package for managed integrations, plus the
 * policy of each service instance.
 */
const getOwnedPackagePolicyIds = ({
  packagePolicyIds,
  policyIdsByInstance,
}: Pick<CloudOnboardingDeploymentSOAttributes, 'packagePolicyIds' | 'policyIdsByInstance'>) =>
  new Set([...(packagePolicyIds ?? []), ...Object.values(policyIdsByInstance ?? {})]);

const MAX_UPDATE_ATTEMPTS = 5;
const UPDATE_RETRY_BASE_DELAY_MS = 25;

// Jittered delay (0..base * attempt ms) so concurrent writers that just conflicted don't retry in lockstep.
const sleepWithJitter = (attempt: number) =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, Math.random() * UPDATE_RETRY_BASE_DELAY_MS * attempt)
  );

class CloudOnboardingDeploymentService {
  public async create(
    soClient: SavedObjectsClientContract,
    input: CreateCloudOnboardingDeploymentInput,
    updatedBy?: string,
    packagePolicySoClient: SavedObjectsClientContract = soClient
  ): Promise<CloudOnboardingDeployment> {
    // Validates connectorId exists in the same space; throws SavedObjectsErrorHelpers not-found if not.
    if (input.connectorId) {
      await soClient.get(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, input.connectorId);
    }

    const attributes: CloudOnboardingDeploymentSOAttributes = {
      ...input,
      status: 'pending',
      attemptCount: 1,
      ...(updatedBy ? { updatedBy } : {}),
    };

    const so = await soClient.create<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      attributes
    );

    // A new deployment has nothing stamped yet, so there is only something to do if it owns policies.
    if (getOwnedPackagePolicyIds(attributes).size) {
      await this.syncPackagePolicyOwnership(soClient, packagePolicySoClient, so.id);
    }

    return toDeployment(so);
  }

  public async getById(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<CloudOnboardingDeployment> {
    const so = await soClient.get<CloudOnboardingDeploymentSOAttributes>(
      CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      id
    );

    return toDeployment(so);
  }

  public async list(
    soClient: SavedObjectsClientContract,
    { packageName, provider, page = 1, perPage = 20 }: ListCloudOnboardingDeploymentsOptions = {}
  ): Promise<{
    items: CloudOnboardingDeployment[];
    total: number;
    page: number;
    perPage: number;
  }> {
    const attributePath = (name: string) =>
      `${CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE}.attributes.${name}`;
    const filters = [
      ...(packageName ? [nodeBuilder.is(attributePath('packageNames'), packageName)] : []),
      ...(provider ? [nodeBuilder.is(attributePath('provider'), provider)] : []),
    ];

    const result = await soClient.find<CloudOnboardingDeploymentSOAttributes>({
      type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      ...(filters.length ? { filter: nodeBuilder.and(filters) } : {}),
      sortField: 'updated_at',
      sortOrder: 'desc',
      page,
      perPage,
    });

    return {
      items: result.saved_objects.map(toDeployment),
      total: result.total,
      page,
      perPage,
    };
  }

  /**
   * The number of deployments that cover each package, by package name. A deployment covering
   * several packages counts once for each of them; one without packageNames is not counted.
   */
  public async getCountsByPackage(
    soClient: SavedObjectsClientContract,
    { provider }: { provider?: string } = {}
  ): Promise<Record<string, number>> {
    const result = await soClient.find<
      CloudOnboardingDeploymentSOAttributes,
      { by_package: { buckets: Array<{ key: string; doc_count: number }> } }
    >({
      type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      perPage: 0,
      ...(provider
        ? {
            filter: nodeBuilder.is(
              `${CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE}.attributes.provider`,
              provider
            ),
          }
        : {}),
      aggs: {
        by_package: {
          terms: {
            field: `${CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE}.attributes.packageNames`,
            size: MAX_COUNTED_PACKAGES,
          },
        },
      },
    });

    return Object.fromEntries(
      (result.aggregations?.by_package?.buckets ?? []).map(({ key, doc_count: count }) => [
        key,
        count,
      ])
    );
  }

  public async getByConnectorId(
    soClient: SavedObjectsClientContract,
    connectorId: string
  ): Promise<CloudOnboardingDeployment[]> {
    const finder = soClient.createPointInTimeFinder<CloudOnboardingDeploymentSOAttributes>({
      type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
      filter: nodeBuilder.is(
        `${CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE}.attributes.connectorId`,
        connectorId
      ),
      perPage: CLOUD_ONBOARDING_DEPLOYMENT_LIMIT,
    });

    const deployments: CloudOnboardingDeployment[] = [];
    try {
      outer: for await (const result of finder.find()) {
        for (const so of result.saved_objects) {
          deployments.push(toDeployment(so));
          if (deployments.length >= CLOUD_ONBOARDING_DEPLOYMENT_LIMIT) {
            break outer;
          }
        }
      }
    } finally {
      await finder.close();
    }
    return deployments;
  }

  public async update(
    soClient: SavedObjectsClientContract,
    id: string,
    update: UpdateCloudOnboardingDeploymentInput,
    updatedBy?: string,
    packagePolicySoClient: SavedObjectsClientContract = soClient
  ): Promise<CloudOnboardingDeployment> {
    // soClient.update sends a partial ES doc update. ES deep-merges nested objects, so keys
    // removed from record fields like policyIdsByInstance or serviceVars would persist in the
    // stored document. Use get + create(overwrite) for a full-replace write instead. The write
    // carries the version from the read, so a concurrent write is rejected with a conflict
    // instead of being clobbered; the update is then re-applied over the fresh document.
    // A null description or namespace clears it. The saved object schema has no null for them, so
    // the key is removed rather than stored.
    const { description, namespace, ...rest } = update;

    for (let attempt = 1; ; attempt++) {
      const existing = await soClient.get<CloudOnboardingDeploymentSOAttributes>(
        CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
        id
      );
      const attributes: CloudOnboardingDeploymentSOAttributes = {
        ...existing.attributes,
        ...rest,
        ...(description ? { description } : {}),
        ...(namespace ? { namespace } : {}),
        ...(updatedBy ? { updatedBy } : {}),
      };
      if (description === null || description === '') delete attributes.description;
      if (namespace === null || namespace === '') delete attributes.namespace;

      let so: SavedObject<CloudOnboardingDeploymentSOAttributes>;
      try {
        so = await soClient.create<CloudOnboardingDeploymentSOAttributes>(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          attributes,
          { id, overwrite: true, references: existing.references, version: existing.version }
        );
      } catch (error) {
        if (!SavedObjectsErrorHelpers.isConflictError(error) || attempt >= MAX_UPDATE_ATTEMPTS) {
          throw error;
        }
        await sleepWithJitter(attempt);
        continue;
      }

      await this.syncPackagePolicyOwnership(soClient, packagePolicySoClient, id);
      return toDeployment(so);
    }
  }

  // Deleting a deployment leaves its package policies stamped; deleting those policies along with
  // the deployment is tracked in https://github.com/elastic/ingest-dev/issues/10251.
  public async delete(soClient: SavedObjectsClientContract, id: string): Promise<void> {
    await soClient.delete(CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE, id);
  }

  /**
   * Stamps the package policies the deployment owns with its id, and clears the stamp from every
   * other policy stamped with it. The current state is read on every write, so a stamp or a clear
   * that failed on an earlier write is retried.
   *
   * - Only policies of the packages of the onboarding flow are stamped, so an id that is not one of
   *   its policies (for example a Fleet Server policy) can't be locked by a deployment.
   * - A policy stamped by another deployment is left untouched.
   * - The deployment is read after the stamped policies, so a policy stamped by a newer write of
   *   the deployment is seen as owned and not cleared by an older one. Each change carries the
   *   version it was decided on, so a concurrent change makes it fail instead of being overwritten.
   * - Package policies are read and written with the client of the request, so the caller needs the
   *   privileges for them. `deploymentSoClient` only reads the deployment.
   *
   * Failures are logged and do not fail the deployment write: an unstamped policy stays visible and
   * editable in Fleet.
   */
  private async syncPackagePolicyOwnership(
    deploymentSoClient: SavedObjectsClientContract,
    soClient: SavedObjectsClientContract,
    deploymentId: string
  ): Promise<void> {
    const logger = appContextService.getLogger();
    try {
      const savedObjectType = await getPackagePolicySavedObjectType();
      const { saved_objects: stampedPolicies } = await soClient.find<PackagePolicySOAttributes>({
        type: savedObjectType,
        filter: nodeBuilder.is(
          `${savedObjectType}.attributes.onboarding_deployment_id`,
          deploymentId
        ),
        perPage: SO_SEARCH_LIMIT,
      });
      const { attributes: deployment } =
        await deploymentSoClient.get<CloudOnboardingDeploymentSOAttributes>(
          CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
          deploymentId
        );
      const ownedIds = getOwnedPackagePolicyIds(deployment);

      const stampedIds = new Set(stampedPolicies.map(({ id }) => id));
      const unstampedIds = [...ownedIds].filter((policyId) => !stampedIds.has(policyId));
      const { saved_objects: unstampedPolicies } = unstampedIds.length
        ? await soClient.bulkGet<PackagePolicySOAttributes>(
            unstampedIds.map((policyId) => ({ type: savedObjectType, id: policyId }))
          )
        : { saved_objects: [] };

      const updates: Array<SavedObjectsBulkUpdateObject<PackagePolicySOAttributes>> = [];
      for (const policy of stampedPolicies) {
        // A previous revision keeps the stamp of the snapshot; it is never restored over a newer one.
        if (!ownedIds.has(policy.id) && policy.attributes.latest_revision !== false) {
          updates.push({
            type: savedObjectType,
            id: policy.id,
            version: policy.version,
            attributes: { onboarding_deployment_id: null },
          });
        }
      }
      for (const policy of unstampedPolicies) {
        // Missing policies were deleted out-of-band; previous revisions are never stamped.
        if (isSavedObjectErrorResult(policy) || policy.attributes.latest_revision === false) {
          continue;
        }
        const packageName = policy.attributes.package?.name;
        if (!packageName || !AWS_ONBOARDING_PACKAGE_NAMES.includes(packageName)) {
          logger.warn(
            `Package policy ${policy.id} is not a policy of the packages of the onboarding flow, not stamping it with ${deploymentId}`
          );
          continue;
        }
        const current = policy.attributes.onboarding_deployment_id;
        if (current) {
          logger.warn(
            `Package policy ${policy.id} is managed by cloud onboarding instance ${current}, not stamping it with ${deploymentId}`
          );
          continue;
        }
        updates.push({
          type: savedObjectType,
          id: policy.id,
          version: policy.version,
          attributes: { onboarding_deployment_id: deploymentId },
        });
      }
      if (!updates.length) {
        return;
      }

      const { saved_objects: results } = await soClient.bulkUpdate<PackagePolicySOAttributes>(
        updates
      );
      for (const result of results) {
        if (isSavedObjectErrorResult(result)) {
          logger.warn(
            `Failed to update the onboarding instance of package policy ${result.id}: ${result.error.message}`
          );
        } else {
          auditLoggingService.writeCustomSoAuditLog({
            action: 'update',
            id: result.id,
            savedObjectType,
          });
        }
      }
    } catch (error) {
      logger.warn(
        `Failed to sync package policies of cloud onboarding instance ${deploymentId}: ${error.message}`
      );
    }
  }
}

export const cloudOnboardingDeploymentService = new CloudOnboardingDeploymentService();
