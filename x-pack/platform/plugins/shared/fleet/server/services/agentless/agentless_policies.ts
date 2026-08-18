/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AuthenticatedUser,
  type ElasticsearchClient,
  type KibanaRequest,
  type Logger,
  type RequestHandlerContext,
  type SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import { omit, uniq } from 'lodash';
import pMap from 'p-map';
import semverEq from 'semver/functions/eq';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type {
  NewAgentlessPolicy,
  AgentlessPolicy,
  AgentlessAgentPolicyConfig,
  AgentPolicy,
  NewPackagePolicy,
  PackagePolicy,
  ListWithKuery,
  ListResult,
  UpgradePackagePolicyDryRunResponseItem,
} from '../../../common/types';
import type {
  BulkUpgradeAgentlessPoliciesResponse,
  BulkUpgradeAgentlessPolicyResult,
  AgentlessPolicyUpgradeDryRunResponse,
  AgentlessPolicyUpgradeDryRunResult,
} from '../../../common/types/rest_spec/agentless_policy';

import {
  AGENTLESS_AGENT_POLICY_INACTIVITY_TIMEOUT,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../common/constants';

import {
  formatInputs,
  formatVars,
  simplifiedPackagePolicytoNewPackagePolicy,
} from '../../../common/services/simplified_package_policy_helper';

import type { PackagePolicyClient } from '../package_policy_service';

import { agentPolicyService } from '../agent_policy';
import { getInstallation, getPackageInfo } from '../epm/packages';
import { runWithCache } from '../epm/packages/cache';
import { appContextService, cloudConnectorService } from '..';
import { FleetNotFoundError, PackagePolicyRequestError } from '../../errors';
import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_10 } from '../../constants';

import type { PackageInfo } from '../../types';
import {
  getAgentlessAgentPolicyNameFromPackagePolicyName,
  getAgentlessGlobalDataTags,
} from '../../../common/services/agentless_policy_helper';
import { agentlessAgentService } from '../agents/agentless_agent';
import { createAndIntegrateCloudConnector } from '../cloud_connectors';

import { prefixKueryFieldsWithSavedObjectType } from './kuery_utils';

/**
 * Options accepted by {@link AgentlessPoliciesService.listAgentlessPolicies}.
 *
 * Built from {@link ListWithKuery} but narrowed to the fields the agentless LIST
 * endpoint actually supports — `fields` and the `HttpFetchQuery` index signature
 * are intentionally excluded.
 */
export type ListAgentlessPoliciesOptions = Pick<
  ListWithKuery,
  'page' | 'perPage' | 'sortField' | 'sortOrder' | 'kuery'
>;

export interface AgentlessPoliciesService {
  createAgentlessPolicy: (
    data: NewAgentlessPolicy,
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ) => Promise<AgentlessPolicy>;

  updateAgentlessPolicy: (
    policyId: string,
    data: NewAgentlessPolicy,
    request?: KibanaRequest
  ) => Promise<AgentlessPolicy>;

  deleteAgentlessPolicy: (
    policyId: string,
    options?: { force?: boolean },
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ) => Promise<void>;

  getAgentlessPolicy: (policyId: string) => Promise<AgentlessPolicy | null>;

  listAgentlessPolicies: (
    options?: ListAgentlessPoliciesOptions
  ) => Promise<ListResult<AgentlessPolicy>>;

  bulkUpgradeAgentlessPolicies: (
    policyIds: string[],
    request?: KibanaRequest
  ) => Promise<BulkUpgradeAgentlessPoliciesResponse>;

  getAgentlessPolicyUpgradeDryRunDiff: (
    policyIds: string[],
    pkgVersion?: string
  ) => Promise<AgentlessPolicyUpgradeDryRunResponse>;
}

const getAgentlessAgentPolicyConfig = (
  packageInfo?: PackageInfo
): AgentlessAgentPolicyConfig | undefined => {
  if (
    !packageInfo?.policy_templates &&
    !packageInfo?.policy_templates?.some((policy) => policy.deployment_modes)
  ) {
    return;
  }
  const agentlessPolicyTemplate = packageInfo.policy_templates.find(
    (policy) => policy.deployment_modes
  );

  // assumes that all the policy templates agentless deployments modes indentify have the same organization, division and team
  const agentlessInfo = agentlessPolicyTemplate?.deployment_modes?.agentless;

  if (!agentlessInfo?.resources) {
    return;
  }

  return {
    resources: agentlessInfo.resources,
  };
};

export const packagePolicyToAgentlessPolicy = (packagePolicy: PackagePolicy): AgentlessPolicy => {
  // PackagePolicy.package is always set for agentless policies created through this service but optional in the general type
  if (!packagePolicy.package) {
    throw new Error(`Agentless policy ${packagePolicy.id} is missing a package reference`);
  }

  const supportsAgentless = true;
  return {
    id: packagePolicy.id,
    name: packagePolicy.name,
    description: packagePolicy.description,
    namespace: packagePolicy.namespace,
    package: {
      name: packagePolicy.package.name,
      title: packagePolicy.package.title,
      version: packagePolicy.package.version,
    },
    inputs: formatInputs(packagePolicy.inputs, supportsAgentless) ?? {},
    vars: formatVars(packagePolicy.vars),
    var_group_selections: packagePolicy.var_group_selections,
    additional_datastreams_permissions: packagePolicy.additional_datastreams_permissions,
    global_data_tags: packagePolicy.global_data_tags,
    cloud_connector: packagePolicy.cloud_connector_id
      ? { enabled: true, cloud_connector_id: packagePolicy.cloud_connector_id }
      : null,
    created_at: packagePolicy.created_at,
    created_by: packagePolicy.created_by,
    updated_at: packagePolicy.updated_at,
    updated_by: packagePolicy.updated_by,
  };
};

/**
 * Converts a stored {@link PackagePolicy} back into an update payload by dropping read-only
 * saved-object metadata and the compiled (server-generated) input/stream fields that the
 * update path rejects. Used only by the rollback path to restore the prior package policy.
 */
const toUpdatePackagePolicy = (packagePolicy: PackagePolicy): NewPackagePolicy => {
  const {
    id,
    spaceIds,
    version,
    agents,
    revision,
    secret_references: secretReferences,
    created_at: createdAt,
    created_by: createdBy,
    updated_at: updatedAt,
    updated_by: updatedBy,
    package_agent_version_condition: packageAgentVersionCondition,
    inputs,
    ...rest
  } = packagePolicy;

  return {
    ...rest,
    inputs: inputs.map(({ compiled_input: compiledInput, streams, ...restInput }) => ({
      ...restInput,
      streams: streams.map(({ compiled_stream: compiledStream, ...restStream }) => restStream),
    })),
  };
};

export class AgentlessPoliciesServiceImpl implements AgentlessPoliciesService {
  constructor(
    private readonly packagePolicyService: PackagePolicyClient,
    private readonly soClient: SavedObjectsClientContract,
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  async createAgentlessPolicy(
    data: NewAgentlessPolicy,
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ) {
    const packagePolicyId = data.id || uuidv4();

    const policyTemplate = data.policy_template;

    const agentPolicyId = packagePolicyId; // Use the same ID for agent policy and package policy
    const force = data.force;
    this.logger.debug('Creating agentless policy');

    const user = request
      ? appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined
      : undefined;

    const spaceId = this.soClient.getCurrentNamespace() || DEFAULT_SPACE_ID;

    let createdAgentPolicyId: string | undefined;
    let createdCloudConnectorId: string | undefined;
    let cloudConnectorWasCreated = false;

    try {
      const pkg = data.package;
      this.logger.debug(`Creating agentless agent policy ${agentPolicyId}`);
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: this.soClient,
        pkgName: pkg.name,
        pkgVersion: pkg.version,
        ignoreUnverified: force,
        prerelease: true,
      });

      // Built ahead of agent policy creation (using the pre-generated `agentPolicyId`) so its
      // real inputs are known when choosing the data output below.
      const newPolicy = {
        ...omit(data, 'id', 'package', 'cloud_connector'),
        namespace: data.namespace || 'default',
        policy_ids: [agentPolicyId],
        supports_agentless: true,
        // Extract cloud connector fields from cloud_connector object
        ...(data.cloud_connector &&
          data.cloud_connector.enabled && {
            supports_cloud_connector: true,
            ...(data.cloud_connector.cloud_connector_id && {
              cloud_connector_id: data.cloud_connector.cloud_connector_id,
            }),
          }),
      };

      let newPackagePolicy = simplifiedPackagePolicytoNewPackagePolicy(newPolicy, pkgInfo, {
        policyTemplate,
      });

      const { outputId, fleetServerId } = agentlessAgentService.getDefaultSettings({
        package_policies: [
          {
            package: { name: pkg.name },
            inputs: newPackagePolicy.inputs,
          },
        ],
      });

      const agentPolicyName = getAgentlessAgentPolicyNameFromPackagePolicyName(data.name);

      // Get base agentless config from package info
      const baseAgentlessConfig = getAgentlessAgentPolicyConfig(pkgInfo);

      // Build agentless config with cloud connectors if provided
      let agentlessConfig = baseAgentlessConfig;
      if (data.cloud_connector?.enabled) {
        this.logger.debug(
          `Configuring cloud connectors for cloud provider: ${
            data.cloud_connector.target_csp || 'undefined'
          } from cloud_connector object`
        );
        agentlessConfig = {
          ...baseAgentlessConfig,
          cloud_connectors: {
            target_csp: data.cloud_connector.target_csp,
            enabled: true,
          },
        };
      }

      const agentPolicy = await agentPolicyService.create(
        this.soClient,
        this.esClient,
        {
          name: agentPolicyName,
          description: 'Internal agentless policy',
          inactivity_timeout: AGENTLESS_AGENT_POLICY_INACTIVITY_TIMEOUT,
          supports_agentless: true,
          namespace: data.namespace || 'default',
          monitoring_enabled: [],
          keep_monitoring_alive: true,
          agentless: agentlessConfig,
          global_data_tags: getAgentlessGlobalDataTags(pkgInfo),
          fleet_server_host_id: fleetServerId,
          data_output_id: outputId,
          monitoring_output_id: outputId,
          is_protected: false,
        },
        { id: agentPolicyId, skipDeploy: true, request, user }
      );

      createdAgentPolicyId = agentPolicy.id;

      // Integrate cloud connector if enabled for this agentless policy
      const {
        packagePolicy: updatedPackagePolicy,
        cloudConnectorId,
        wasCreated,
      } = await createAndIntegrateCloudConnector({
        packagePolicy: newPackagePolicy,
        agentPolicy,
        policyName: data.name,
        packageInfo: pkgInfo,
        soClient: this.soClient,
        esClient: this.esClient,
        logger: this.logger,
        cloudConnectorName: data.cloud_connector?.name,
        policyTemplate,
      });

      newPackagePolicy = updatedPackagePolicy;
      createdCloudConnectorId = cloudConnectorId;
      cloudConnectorWasCreated = wasCreated;

      // Create package policy
      this.logger.debug(`Creating agentless package policy ${packagePolicyId}`);
      const packagePolicy = await this.packagePolicyService.create(
        this.soClient,
        this.esClient,
        newPackagePolicy,
        {
          id: packagePolicyId,
          force,
          bumpRevision: false,
          spaceId,
          user,
          createDatasetTemplates: data.create_dataset_templates,
        },
        context,
        request
      );

      this.logger.debug(`Deploy agentless policy ${agentPolicyId}`);
      await agentPolicyService.deployPolicy(this.soClient, agentPolicyId, undefined, {
        throwOnAgentlessError: true,
      });

      return packagePolicyToAgentlessPolicy(packagePolicy);
    } catch (err) {
      // Handle cloud connector rollback
      if (createdCloudConnectorId) {
        if (cloudConnectorWasCreated) {
          // If we created a new cloud connector, delete it to avoid orphaned connectors
          this.logger.debug(
            `Rolling back: deleting created cloud connector ${createdCloudConnectorId}`
          );
          await cloudConnectorService
            .delete(this.soClient, this.esClient, createdCloudConnectorId, true)
            .catch((e: Error) => {
              this.logger.error(
                `Failed to delete cloud connector ${createdCloudConnectorId}: ${e.message}`,
                { error: e }
              );
            });
        }
      }

      // If policy was created and error happens later during package policy creation or agentless API call, delete the created policy to avoid orphaned policies
      if (createdAgentPolicyId) {
        await agentPolicyService
          .delete(this.soClient, this.esClient, createdAgentPolicyId, {
            force: true,
          })
          .catch((e) => {
            this.logger.error(
              `Failed to delete agentless agent policy ${createdAgentPolicyId}: ${e.message}`,
              { error: e }
            );
          });
      }

      throw err;
    }
  }

  /**
   * Full-replace update of an agentless policy.
   *
   * Flow:
   *   1. Load + guard the target (must exist and be agentless, else 404).
   *   2. Update the package policy SO.
   *   3. Update the backing agent policy SO.
   *   4. Deploy → push config to the live agentless workload.
   *   on failure → best-effort rollback (restore SOs, drop any connector we created), rethrow.
   *
   * Consistency: there is no transaction across the two SOs + the external workload, so a mid-flow
   * failure can momentarily leave them out of sync. This is self-healing, not permanent:
   *   - Step 3 bumps the agent policy `revision` (step 2 uses `bumpRevision: false`).
   *   - Step 4 (and the rollback restore) attempt an immediate re-sync.
   *   - Backstop: the periodic deployment-sync task re-pushes whenever the workload's deployed
   *     revision lags the SO `revision`, so the live workload eventually converges to SO state.
   * Worst case is therefore a bounded convergence delay (one sync interval), not lasting divergence.
   */
  async updateAgentlessPolicy(
    policyId: string,
    data: NewAgentlessPolicy,
    request?: KibanaRequest
  ): Promise<AgentlessPolicy> {
    this.logger.debug(`Updating agentless policy ${policyId}`);

    const user = request
      ? appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined
      : undefined;

    const force = data.force;
    const policyTemplate = data.policy_template;

    // Load and guard the target. A missing policy, or one that is not agentless throws a 404
    const existingAgentPolicy = await this.getExistingAgentlessAgentPolicy(policyId);
    const existingPackagePolicy = await this.getExistingAgentlessPackagePolicy(policyId);

    const pkg = data.package;
    // `package` is accepted (full-replace, symmetric with POST). The package name is
    // immutable (swapping the integration on an existing deployment is not supported),
    // but the version may change: a PUT can bump (or downgrade) the package version,
    // mirroring the regular package-policy PUT.
    this.assertPackageNameUnchanged(existingPackagePolicy, pkg);

    // Load package info for the *requested* version (not the stored one) so a version
    // change re-derives the agentless config, resources, global data tags and inputs
    // against the new version.
    const pkgInfo = await getPackageInfo({
      savedObjectsClient: this.soClient,
      pkgName: pkg.name,
      pkgVersion: pkg.version,
      ignoreUnverified: force,
      prerelease: true,
    });

    let createdCloudConnectorId: string | undefined;
    let cloudConnectorWasCreated = false;
    let packagePolicyUpdateAttempted = false;
    let agentPolicyUpdateAttempted = false;

    try {
      // Rebuild the agent policy's agentless config full-replace: config-derived fields are
      // re-derived from package info / the request, but runtime-managed fields written back by
      // the deployment sync (currently only `cluster_id`) must be preserved below, or the next
      // sync would treat the workload as un-clustered.
      const baseAgentlessConfig = getAgentlessAgentPolicyConfig(pkgInfo);
      let agentlessConfig: AgentlessAgentPolicyConfig | undefined = baseAgentlessConfig;

      const existingClusterId = existingAgentPolicy.agentless?.cluster_id;
      if (existingClusterId) {
        agentlessConfig = { ...(agentlessConfig ?? {}), cluster_id: existingClusterId };
      }

      if (data.cloud_connector?.enabled) {
        agentlessConfig = {
          ...(agentlessConfig ?? {}),
          cloud_connectors: {
            target_csp: data.cloud_connector.target_csp,
            enabled: true,
          },
        };
      }

      // Full-replace: `packagePolicyService.update` persists via a partial `soClient.update` that
      // drops serialized `undefined`, so an omitted field would silently retain its stale value.
      // To honor the full-replace contract, every optional field is coalesced to an explicit
      // "empty" value so omission actually clears it (mirrors the connector fields below).
      const cloudConnectorEnabled = Boolean(data.cloud_connector?.enabled);
      const newPolicy = {
        // Strip the create-only fields the update contract accepts-but-ignores (see the PUT body
        // schema comment): `id` (target comes from the path param) and `create_dataset_templates`
        // (a create-time install flag with no update equivalent). `simplifiedPackagePolicytoNewPackagePolicy`
        // is already an allow-list mapper that would drop them, so this is defensive/explicit, not a fix.
        ...omit(data, 'id', 'package', 'cloud_connector', 'create_dataset_templates'),
        namespace: data.namespace || 'default',
        policy_ids: [policyId],
        supports_agentless: true,
        description: data.description ?? '',
        global_data_tags: data.global_data_tags ?? [],
        additional_datastreams_permissions: data.additional_datastreams_permissions ?? [],
        var_group_selections: data.var_group_selections ?? {},
        supports_cloud_connector: cloudConnectorEnabled,
        cloud_connector_id: cloudConnectorEnabled
          ? data.cloud_connector?.cloud_connector_id ?? null
          : null,
      };

      let newPackagePolicy = simplifiedPackagePolicytoNewPackagePolicy(newPolicy, pkgInfo, {
        policyTemplate,
      });

      // Handle cloud-connector add / reuse / swap. Detaching or swapping only updates the reference;
      // Previous connector is left in place, as connectors are shareable and managed via their own API.
      const {
        packagePolicy: integratedPackagePolicy,
        cloudConnectorId,
        wasCreated,
      } = await createAndIntegrateCloudConnector({
        packagePolicy: newPackagePolicy,
        agentPolicy: { ...existingAgentPolicy, agentless: agentlessConfig },
        policyName: data.name,
        packageInfo: pkgInfo,
        soClient: this.soClient,
        esClient: this.esClient,
        logger: this.logger,
        cloudConnectorName: data.cloud_connector?.name,
        policyTemplate,
      });

      newPackagePolicy = integratedPackagePolicy;
      createdCloudConnectorId = cloudConnectorId;
      cloudConnectorWasCreated = wasCreated;

      // Persist the new package policy with `bumpRevision: false`: we don't want the package-policy
      // update to bump the agent policy revision or fire its own deploy — the agent-policy update
      // below owns the single revision bump, and the explicit `deployPolicy` owns the reconcile.
      this.logger.debug(`Updating agentless package policy ${policyId}`);
      packagePolicyUpdateAttempted = true; // Flagging the attempt guarantees the rollback restores it
      const updatedPackagePolicy = await this.packagePolicyService.update(
        this.soClient,
        this.esClient,
        policyId,
        newPackagePolicy,
        { user, force, bumpRevision: false }
      );

      // Update the backing agent policy. Its `global_data_tags` are the package's fixed agentless
      // ownership tags (org/division/team), always re-derived from package info — NOT the caller's
      // `data.global_data_tags`, which are the user's custom tags and were applied to the package
      // policy above. Default `bumpRevision: true` advances the agent policy `revision`, which is
      // what the deployment-sync backstop compares against (`revision_idx < revision`) to self-heal
      // a diverged workload. It also fires a best-effort deploy via the update event; the explicit
      // `deployPolicy({ throwOnAgentlessError: true })` below is the authoritative, error-surfacing
      // reconcile (the event-handler deploy can't surface a failure since it doesn't throw).
      this.logger.debug(`Updating agentless agent policy ${policyId}`);
      agentPolicyUpdateAttempted = true; // set before await — same rollback-safety rationale as above
      await agentPolicyService.update(
        this.soClient,
        this.esClient,
        policyId,
        {
          name: getAgentlessAgentPolicyNameFromPackagePolicyName(data.name),
          namespace: data.namespace || 'default',
          agentless: agentlessConfig,
          global_data_tags: getAgentlessGlobalDataTags(pkgInfo),
        },
        { user, force }
      );

      // Re-sync the saved-object config to the live agentless workload. throwOnAgentlessError
      // makes a failed external reconcile fail the whole operation instead of silently
      // leaving the deployment out of sync.
      this.logger.debug(`Deploy agentless policy ${policyId}`);
      await agentPolicyService.deployPolicy(this.soClient, policyId, undefined, {
        throwOnAgentlessError: true,
      });

      return packagePolicyToAgentlessPolicy(updatedPackagePolicy);
    } catch (err) {
      // Log the triggering failure at error level before attempting rollback. The error is also
      // surfaced to the caller (rethrown below), but logging it here guarantees a server-side
      // record correlated with the rollback-outcome log, even for errors the route maps to a
      // generic client response.
      this.logger.error(
        `Failed to update agentless policy ${policyId}, attempting rollback: ${err.message}`,
        { error: err }
      );

      await this.rollbackAgentlessPolicyUpdate({
        policyId,
        existingPackagePolicy,
        existingAgentPolicy,
        createdCloudConnectorId,
        cloudConnectorWasCreated,
        packagePolicyUpdateAttempted,
        agentPolicyUpdateAttempted,
        user,
        originalError: err,
      });

      throw err;
    }
  }

  async deleteAgentlessPolicy(
    policyId: string,
    options?: { force?: boolean },
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ) {
    this.logger.debug(`Deleting agentless policy ${policyId}`);

    const user = request
      ? appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined
      : undefined;

    let agentPolicy;
    try {
      agentPolicy = await agentPolicyService.get(this.soClient, policyId);
    } catch (e) {
      if (e instanceof FleetNotFoundError || SavedObjectsErrorHelpers.isNotFoundError(e)) {
        this.logger.warn(`Agent policy ${policyId} not found, cleaning up orphaned resources`);
        await this.deleteOrphanedAgentlessResources(policyId, user);
        return;
      }
      throw e;
    }

    if (!agentPolicy?.supports_agentless) {
      throw new Error(`Policy ${policyId} is not an agentless policy`);
    }

    // Delete agent policy (this will also delete associated package policies)
    await agentPolicyService.delete(this.soClient, this.esClient, policyId, {
      force: options?.force,
      user,
    });
  }

  async getAgentlessPolicy(policyId: string): Promise<AgentlessPolicy | null> {
    this.logger.debug(`Getting agentless policy ${policyId}`);

    let packagePolicy: PackagePolicy | null;
    try {
      packagePolicy = await this.packagePolicyService.get(this.soClient, policyId);
    } catch (error) {
      // packagePolicyService.get throws (rather than returning null) when the underlying
      // package policy is missing. Collapse a not-found into a null result so the handler
      // can return a clean 404 instead of leaking the underlying saved-object error.
      if (error instanceof FleetNotFoundError || SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }

    // Treat a regular (non-agentless) package policy as not found so this API never
    // exposes standard Fleet package policies through the agentless contract.
    if (!packagePolicy || packagePolicy.supports_agentless !== true) {
      return null;
    }

    return packagePolicyToAgentlessPolicy(packagePolicy);
  }

  async listAgentlessPolicies(
    options: ListAgentlessPoliciesOptions = {}
  ): Promise<ListResult<AgentlessPolicy>> {
    // Pin the agentless LIST defaults to our API contract rather than inheriting
    // whatever packagePolicyService.list happens to default to.
    const { page = 1, perPage = 20, sortField = 'updated_at', sortOrder = 'desc', kuery } = options;

    // Always scope the result set to agentless package policies. This filter is applied
    // server-side (and `supports_agentless` is excluded from the allowed kuery fields) so
    // callers can neither widen the scope to regular package policies nor override it.
    const agentlessFilter = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.supports_agentless:true`;
    const normalizedKuery = kuery
      ? prefixKueryFieldsWithSavedObjectType(kuery, PACKAGE_POLICY_SAVED_OBJECT_TYPE)
      : undefined;
    const combinedKuery = normalizedKuery
      ? `(${agentlessFilter}) AND (${normalizedKuery})`
      : agentlessFilter;

    this.logger.debug(`Listing agentless policies with kuery [${combinedKuery}]`);

    const result = await this.packagePolicyService.list(this.soClient, {
      page,
      perPage,
      sortField,
      sortOrder,
      kuery: combinedKuery,
    });

    this.logger.debug(`Listed ${result.total} agentless policies`);

    return {
      items: result.items.map(packagePolicyToAgentlessPolicy),
      total: result.total,
      page: result.page,
      perPage: result.perPage,
    };
  }

  async bulkUpgradeAgentlessPolicies(
    policyIds: string[],
    request?: KibanaRequest
  ): Promise<BulkUpgradeAgentlessPoliciesResponse> {
    this.logger.debug(`Bulk upgrading ${policyIds.length} agentless policies`);

    const user = request
      ? appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined
      : undefined;

    // Batched agentless guard: missing or non-agentless ids become per-policy 404
    // failures rather than failing the whole batch
    const { agentlessPackagePolicies, guardFailures } = await this.partitionAgentlessPolicyIds(
      policyIds
    );

    const results: BulkUpgradeAgentlessPolicyResult[] = [...guardFailures];

    if (agentlessPackagePolicies.length === 0) {
      return results;
    }

    // Skip already-latest policies: report `success: true` without the engine's needless SO re-persist + redeploy churn.
    const { upgradeIds, noopResults } = await this.partitionAlreadyLatestPolicies(
      agentlessPackagePolicies
    );
    results.push(...noopResults);

    if (upgradeIds.length > 0) {
      // Reuse the package-policy bulk upgrade engine: it migrates the config and persists the
      // saved objects. `success` reflects that SO upgrade; the deploy is scheduled in the
      // background (like package-policy), not run synchronously here.
      const upgradeResults = await this.packagePolicyService.bulkUpgrade(
        this.soClient,
        this.esClient,
        upgradeIds,
        { user }
      );

      for (const result of upgradeResults) {
        results.push({
          id: result.id,
          name: result.name,
          success: result.success,
          statusCode: result.statusCode,
          body: result.body,
        });
      }
    }

    // Return results in the caller's requested order (guard failures and engine
    // results are otherwise interleaved), so a client can zip the response against
    // its input list positionally as well as by `id`.
    return this.orderResultsByRequest(policyIds, results);
  }

  async getAgentlessPolicyUpgradeDryRunDiff(
    policyIds: string[],
    pkgVersion?: string
  ): Promise<AgentlessPolicyUpgradeDryRunResponse> {
    this.logger.debug(`Computing upgrade dry-run for ${policyIds.length} agentless policies`);

    const { agentlessPackagePolicies, guardFailures } = await this.partitionAgentlessPolicyIds(
      policyIds
    );

    // A guard failure (missing / non-agentless) is surfaced as a dry-run item with
    // `hasErrors: true` plus the per-policy statusCode/body, keeping the response a flat
    // per-policy array (200 even on partial failure).
    const results: AgentlessPolicyUpgradeDryRunResult[] = guardFailures.map((failure) => ({
      id: failure.id,
      name: failure.name,
      hasErrors: true,
      statusCode: failure.statusCode,
      body: failure.body,
    }));

    if (agentlessPackagePolicies.length === 0) {
      return results;
    }

    // `runWithCache` shares EPM asset/package-info lookups across all policies in the
    // batch (matches the package-policy dry-run handler), avoiding repeated fetches when
    // policies share a package.
    await runWithCache(async () => {
      for (const { id } of agentlessPackagePolicies) {
        try {
          // `pkgVersion` lets the caller preview a migration to a not-yet-installed target
          // version (the UI computes the dry-run before installing the new package). When
          // undefined, `getUpgradeDryRunDiff` defaults to the installed package version.
          const diff = await this.packagePolicyService.getUpgradeDryRunDiff(
            this.soClient,
            id,
            undefined,
            pkgVersion
          );
          results.push(this.projectUpgradeDryRunDiff(id, diff));
        } catch (err) {
          this.logger.error(
            `Failed to compute upgrade dry-run for agentless policy ${id}: ${err.message}`,
            { error: err }
          );
          results.push({
            id,
            hasErrors: true,
            statusCode: 500,
            body: { message: err.message },
          });
        }
      }
    });

    return this.orderResultsByRequest(policyIds, results);
  }

  /**
   * Reorders per-policy results to match the caller's requested id order. Guard failures
   * and engine results are produced in separate passes, so without this the response would
   * group all guard failures first. Ordering by request keeps the response positionally
   * aligned with the input `policyIds`. Any id without a result is dropped (defensive; in
   * practice every requested id yields exactly one result).
   */
  private orderResultsByRequest<T extends { id: string }>(policyIds: string[], results: T[]): T[] {
    const resultById = new Map(results.map((result) => [result.id, result]));
    return policyIds.flatMap((id) => {
      const result = resultById.get(id);
      return result ? [result] : [];
    });
  }

  /**
   * Splits the requested ids into agentless package policies and per-policy 404 guard failures.
   * Missing and non-agentless policies both become a 404 so this endpoint never operates on
   * regular Fleet package policies (batched equivalent of {@link getExistingAgentlessPackagePolicy}).
   * Returns the full policies (not just ids) so callers can reuse the loaded package name/version
   * (e.g. the already-latest short-circuit) without a second `getByIDs`.
   */
  private async partitionAgentlessPolicyIds(policyIds: string[]): Promise<{
    agentlessPackagePolicies: PackagePolicy[];
    guardFailures: BulkUpgradeAgentlessPolicyResult[];
  }> {
    const packagePolicies = await this.packagePolicyService.getByIDs(this.soClient, policyIds, {
      ignoreMissing: true,
    });
    const packagePolicyById = new Map(packagePolicies.map((pp) => [pp.id, pp]));

    const agentlessPackagePolicies: PackagePolicy[] = [];
    const guardFailures: BulkUpgradeAgentlessPolicyResult[] = [];

    for (const id of policyIds) {
      const packagePolicy = packagePolicyById.get(id);
      if (!packagePolicy || packagePolicy.supports_agentless !== true) {
        guardFailures.push({
          id,
          success: false,
          statusCode: 404,
          body: { message: `Agentless policy ${id} not found` },
        });
        continue;
      }
      agentlessPackagePolicies.push(packagePolicy);
    }

    return { agentlessPackagePolicies, guardFailures };
  }

  /**
   * Splits guarded agentless policies into ids that need a real upgrade and no-op results for
   * policies already at the installed package version.
   */
  private async partitionAlreadyLatestPolicies(agentlessPackagePolicies: PackagePolicy[]): Promise<{
    upgradeIds: string[];
    noopResults: BulkUpgradeAgentlessPolicyResult[];
  }> {
    const packageNames = uniq(
      agentlessPackagePolicies
        .map((pp) => pp.package?.name)
        .filter((name): name is string => typeof name === 'string')
    );

    const installedVersionByPackage = new Map<string, string>();
    await pMap(
      packageNames,
      async (pkgName) => {
        const installation = await getInstallation({
          savedObjectsClient: this.soClient,
          pkgName,
        });
        if (installation) {
          installedVersionByPackage.set(pkgName, installation.version);
        }
      },
      { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_10 }
    );

    const upgradeIds: string[] = [];
    const noopResults: BulkUpgradeAgentlessPolicyResult[] = [];

    for (const packagePolicy of agentlessPackagePolicies) {
      const installedVersion = installedVersionByPackage.get(packagePolicy.package?.name ?? '');
      const policyVersion = packagePolicy.package?.version;
      if (installedVersion && policyVersion && semverEq(installedVersion, policyVersion)) {
        noopResults.push({ id: packagePolicy.id, name: packagePolicy.name, success: true });
      } else {
        upgradeIds.push(packagePolicy.id);
      }
    }

    if (noopResults.length > 0) {
      this.logger.debug(
        `Skipping ${noopResults.length} already-latest agentless policies (no-op, no redeploy)`
      );
    }

    return { upgradeIds, noopResults };
  }

  /**
   * Projects the package-policy dry-run diff into the clean agentless shape. Instead of
   * exposing the raw `[PackagePolicy, DryRunPackagePolicy]` diff, it returns the current and
   * proposed versions and any migration errors, plus — only when the migration is clean
   * (`hasErrors: false`) — the migrated config as a consumable {@link AgentlessPolicy}
   * (`proposedPolicy`). The proposed policy is a `NewPackagePolicy` (no saved-object
   * id/timestamps), so it is overlaid onto the current stored package policy to recover the
   * metadata `packagePolicyToAgentlessPolicy` needs.
   */
  private projectUpgradeDryRunDiff(
    id: string,
    diff: UpgradePackagePolicyDryRunResponseItem
  ): AgentlessPolicyUpgradeDryRunResult {
    // A fatal per-policy dry-run error (e.g. the package is not installed, or the policy is
    // ineligible for upgrade) is returned by `getUpgradeDryRunDiff` *without throwing* and
    // without a `diff` pair, carrying only `statusCode`/`body`. Surface those directly instead
    // of projecting an empty result that would drop the reason for the failure.
    if (!diff.diff) {
      return {
        id,
        name: diff.name,
        hasErrors: true,
        statusCode: diff.statusCode,
        body: diff.body,
      };
    }

    const [currentPackagePolicy, proposedPackagePolicy] = diff.diff;

    // Only return `proposedPolicy` when the dry-run is clean. On errors the proposed config is
    // incomplete, so we send just the error summary. It's meant to be edited and saved via PUT,
    // not applied as-is — to apply an upgrade untouched, use `_upgrade`.
    let proposedPolicy: AgentlessPolicy | undefined;
    if (!diff.hasErrors && currentPackagePolicy && proposedPackagePolicy) {
      proposedPolicy = packagePolicyToAgentlessPolicy({
        ...currentPackagePolicy,
        ...proposedPackagePolicy,
        id: currentPackagePolicy.id,
        created_at: currentPackagePolicy.created_at,
        created_by: currentPackagePolicy.created_by,
        updated_at: currentPackagePolicy.updated_at,
        updated_by: currentPackagePolicy.updated_by,
      } as PackagePolicy);
    }

    return {
      id,
      name: diff.name,
      hasErrors: diff.hasErrors,
      currentVersion: currentPackagePolicy?.package?.version,
      proposedVersion: proposedPackagePolicy?.package?.version,
      proposedPolicy,
      errors: proposedPackagePolicy?.errors?.map((error) => ({ message: error.message })),
    };
  }

  /**
   * Loads the package policy backing an agentless policy, collapsing "missing" and
   * "exists but not agentless" into a single {@link FleetNotFoundError} (404) so the
   * endpoint never confirms the existence of, or operates on, non-agentless policies.
   */
  private async getExistingAgentlessPackagePolicy(policyId: string): Promise<PackagePolicy> {
    let packagePolicy: PackagePolicy | null;
    try {
      packagePolicy = await this.packagePolicyService.get(this.soClient, policyId);
    } catch (error) {
      if (error instanceof FleetNotFoundError || SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw new FleetNotFoundError(`Agentless policy ${policyId} not found`);
      }
      throw error;
    }

    if (!packagePolicy || packagePolicy.supports_agentless !== true) {
      throw new FleetNotFoundError(`Agentless policy ${policyId} not found`);
    }

    return packagePolicy;
  }

  /**
   * Loads the agent policy backing an agentless policy, collapsing "missing" and
   * "exists but not agentless" into a single {@link FleetNotFoundError} (404). Mirrors
   * {@link getExistingAgentlessPackagePolicy}: `agentPolicyService.get` throws a Saved Objects
   * not-found error (not `null`) for a missing policy, so it must be normalized here rather
   * than relying on a truthiness guard.
   */
  private async getExistingAgentlessAgentPolicy(policyId: string): Promise<AgentPolicy> {
    let agentPolicy: AgentPolicy | null;
    try {
      agentPolicy = await agentPolicyService.get(this.soClient, policyId);
    } catch (error) {
      if (error instanceof FleetNotFoundError || SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw new FleetNotFoundError(`Agentless policy ${policyId} not found`);
      }
      throw error;
    }

    if (!agentPolicy?.supports_agentless) {
      throw new FleetNotFoundError(`Agentless policy ${policyId} not found`);
    }

    return agentPolicy;
  }

  /**
   * The integration package name is immutable on update: changing it (swapping the
   * integration on an existing deployment) is rejected with a 400. The package version
   * may change — a version bump/downgrade is handled as a full-replace, mirroring the
   * regular package-policy PUT (bulk upgrades remain a separate flow).
   */
  private assertPackageNameUnchanged(
    existingPackagePolicy: PackagePolicy,
    requestedPackage: NewAgentlessPolicy['package']
  ): void {
    const existingPackage = existingPackagePolicy.package;
    if (!existingPackage) {
      // An agentless package policy is always created with a package, so a missing one is a
      // corrupt saved object. Fail loudly instead of silently allowing the integration to be
      // swapped (the absence of an existing name must not be treated as "name unchanged").
      throw new Error(
        `Agentless policy ${existingPackagePolicy.id} is missing a package reference`
      );
    }
    if (requestedPackage.name !== existingPackage.name) {
      throw new PackagePolicyRequestError(
        `Cannot change the integration package of an agentless policy (from "${existingPackage.name}" to "${requestedPackage.name}").`
      );
    }
  }

  /**
   * Best-effort rollback for a failed update: restore the package + agent policy saved objects and
   * delete any connector this update created. Restoring the SOs also re-deploys, re-syncing the live
   * workload back to the prior config. Pitfall: unlike the forward path, this re-sync does NOT set
   * `throwOnAgentlessError`, so if the external reconcile fails it is only logged (not surfaced). The
   * result is that the saved objects are successfully restored while the live workload may stay in the
   * bad state — i.e. SO state and the running workload can end up diverged. Each step is independently
   * caught/logged (a failure in one doesn't block the others) and the caller always rethrows the original error.
   */
  private async rollbackAgentlessPolicyUpdate({
    policyId,
    existingPackagePolicy,
    existingAgentPolicy,
    createdCloudConnectorId,
    cloudConnectorWasCreated,
    packagePolicyUpdateAttempted,
    agentPolicyUpdateAttempted,
    user,
    originalError,
  }: {
    policyId: string;
    existingPackagePolicy: PackagePolicy;
    existingAgentPolicy: AgentPolicy;
    createdCloudConnectorId?: string;
    cloudConnectorWasCreated: boolean;
    packagePolicyUpdateAttempted: boolean;
    agentPolicyUpdateAttempted: boolean;
    user?: AuthenticatedUser;
    originalError: Error;
  }): Promise<void> {
    // Track which steps were attempted and which failed so we can emit a single rollback-outcome
    // summary at the end. A partially-failed rollback can leave the policy in an inconsistent
    // state, so it must be observable rather than buried in per-step logs.
    const attempted: string[] = [];
    const failed: string[] = [];

    // Restore the package policy first, then the agent policy. The package-policy restore uses
    // `bumpRevision: false` (no revision bump, no deploy); the agent-policy restore below uses the
    // default `bumpRevision: true`, which bumps the revision and fires the re-sync back to the prior
    // config via the `'updated'` event handler. That handler does not set `throwOnAgentlessError`,
    // so the re-sync is best-effort.
    if (packagePolicyUpdateAttempted) {
      attempted.push('package policy');
      this.logger.debug(`Rolling back: restoring package policy ${policyId}`);
      await this.packagePolicyService
        .update(
          this.soClient,
          this.esClient,
          policyId,
          toUpdatePackagePolicy(existingPackagePolicy),
          { user, force: true, bumpRevision: false }
        )
        .catch((e: Error) => {
          failed.push('package policy');
          this.logger.error(
            `Failed to roll back package policy ${policyId} (original update error: ${originalError.message}): ${e.message}`,
            { error: e }
          );
        });
    }

    if (agentPolicyUpdateAttempted) {
      attempted.push('agent policy');
      this.logger.debug(`Rolling back: restoring agent policy ${policyId}`);
      await agentPolicyService
        .update(
          this.soClient,
          this.esClient,
          policyId,
          {
            name: existingAgentPolicy.name,
            namespace: existingAgentPolicy.namespace,
            agentless: existingAgentPolicy.agentless,
            global_data_tags: existingAgentPolicy.global_data_tags,
          },
          { user, force: true }
        )
        .catch((e: Error) => {
          failed.push('agent policy');
          this.logger.error(
            `Failed to roll back agent policy ${policyId} (original update error: ${originalError.message}): ${e.message}`,
            { error: e }
          );
        });
    }

    // Only delete a connector that this update created; reused/pre-existing connectors are
    // left untouched. Now that the package policy no longer references it, force-delete is safe.
    if (createdCloudConnectorId && cloudConnectorWasCreated) {
      attempted.push('created cloud connector');
      this.logger.debug(
        `Rolling back: deleting created cloud connector ${createdCloudConnectorId}`
      );
      await cloudConnectorService
        .delete(this.soClient, this.esClient, createdCloudConnectorId, true)
        .catch((e: Error) => {
          failed.push('created cloud connector');
          this.logger.error(
            `Failed to delete cloud connector ${createdCloudConnectorId} (original update error: ${originalError.message}): ${e.message}`,
            { error: e }
          );
        });
    }

    // Rollback-outcome summary. A failed step is logged at error level (the policy may now be
    // partially reverted / diverged from the live workload); a fully successful rollback is a
    // debug-level note so the original update error stays the headline failure.
    if (failed.length > 0) {
      this.logger.error(
        `Rollback for agentless policy ${policyId} completed with failures. Failed steps: [${failed.join(
          ', '
        )}]. Attempted steps: [${attempted.join(', ')}]. Original update error: ${
          originalError.message
        }`
      );
    } else {
      this.logger.debug(
        `Rollback for agentless policy ${policyId} completed successfully (steps: [${
          attempted.join(', ') || 'none'
        }])`
      );
    }
  }

  private async deleteOrphanedAgentlessResources(policyId: string, user?: AuthenticatedUser) {
    const packagePolicies = await this.packagePolicyService.findAllForAgentPolicy(
      this.soClient,
      policyId
    );

    if (packagePolicies.length > 0) {
      await this.packagePolicyService.delete(
        this.soClient,
        this.esClient,
        packagePolicies.map((pp) => pp.id),
        { force: true, user: user ?? undefined, skipUnassignFromAgentPolicies: true }
      );
    }

    try {
      await agentlessAgentService.deleteAgentlessAgent(policyId);
    } catch (e) {
      this.logger.warn(
        `Failed to delete agentless deployment for orphaned policy ${policyId}: ${e.message}`
      );
    }
  }
}
