/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsErrorHelpers,
  type AuthenticatedUser,
  type ElasticsearchClient,
  type KibanaRequest,
  type Logger,
} from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { LockAcquisitionError } from '@kbn/lock-manager';

import pRetry from 'p-retry';

import { isIamRoleArn } from '../../common/services/cloud_connectors';
import {
  CLOUD_CONNECTOR_IAC_REQUEST_KEYS,
  isCloudConnectorSecretReference,
  type CloudConnector,
  type CloudConnectorIacState,
  type CloudConnectorListOptions,
  type CloudConnectorSecretReference,
  type AwsCloudConnectorVars,
  type AzureCloudConnectorVars,
  type CloudConnectorVars,
  type GcpCloudConnectorVars,
} from '../../common/types/models/cloud_connector';
import type { CloudConnectorSOAttributes } from '../types/so_attributes';
import type {
  CreateCloudConnectorRequest,
  UpdateCloudConnectorRequest,
} from '../../common/types/rest_spec/cloud_connector';
import {
  CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../common/constants';
import {
  TENANT_ID_VAR_NAME,
  CLIENT_ID_VAR_NAME,
  AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID,
  SERVICE_ACCOUNT_VAR_NAME,
  AUDIENCE_VAR_NAME,
  GCP_CREDENTIALS_CLOUD_CONNECTOR_ID,
  buildPackagePolicyFilterExcludingHiddenPackages,
  CLOUD_CONNECTOR_LIST_DEFAULT_PER_PAGE,
} from '../../common/constants/cloud_connector';

import {
  CloudConnectorCreateError,
  CloudConnectorGetListError,
  CloudConnectorInvalidVarsError,
  CloudConnectorDeleteError,
  CloudConnectorRoleArnPropagationError,
  FleetUnauthorizedError,
  rethrowIfInstanceOrWrap,
  getErrorMessage,
} from '../errors';

import { VERIFY_PERMISSIONS_TASK_ID } from '../tasks/agentless/verify_permissions_task_id';

import { appContextService } from './app_context';
import { propagateRoleArnToPackagePolicies } from './cloud_connectors';
import {
  authorizeSharedConnectorRoleArnSpaces,
  isConnectorSharedAcrossSpaces,
} from './cloud_connectors/role_arn_cross_space';
import type { RoleArnPropagationRollback } from './cloud_connectors';
import { validatePolicyNamespaceForSpace } from './spaces/policy_namespaces';
import { extractSecretIdsFromCloudConnectorVars } from './secrets/cloud_connector';
import { deleteSecrets } from './secrets/common';

/** Attempts every rollback, even after one fails, and returns the errors of those that failed. */
const revertEveryRollback = async (
  rollbacks: RoleArnPropagationRollback[],
  onRevertError: (revertError: unknown) => void
): Promise<unknown[]> => {
  const revertErrors: unknown[] = [];
  for (const rollback of rollbacks) {
    try {
      await rollback.revert();
    } catch (revertError) {
      revertErrors.push(revertError);
      onRevertError(revertError);
    }
  }
  return revertErrors;
};

const collectRevertFailures = (
  revertErrors: unknown[]
): { revertFailed: string[]; bumpFailed: boolean } => {
  const structured = revertErrors.filter(
    (revertError): revertError is CloudConnectorRoleArnPropagationError =>
      revertError instanceof CloudConnectorRoleArnPropagationError
  );
  return {
    revertFailed: structured.flatMap((revertError) => revertError.detail.revertFailed),
    bumpFailed: structured.some((revertError) => revertError.detail.bumpFailed),
  };
};

export const hasIacConfirm = (iac: CloudConnectorIacState | undefined): boolean =>
  Boolean(iac && CLOUD_CONNECTOR_IAC_REQUEST_KEYS.some((key) => iac[key] !== undefined));

/**
 * Maps confirm-time IaC fields onto connector SO attributes.
 * A static-template fallback sends iac_key: null so no digest is stored.
 */
export const iacAttributesFromConfirm = (
  iac: CloudConnectorIacState | undefined
): Partial<CloudConnectorSOAttributes> => {
  if (!iac || !hasIacConfirm(iac)) {
    return {};
  }

  const attrs: Partial<CloudConnectorSOAttributes> = {};

  if (iac.iac_key !== undefined) {
    attrs.iac_key = iac.iac_key;
  }
  if (iac.iac_blueprint_id !== undefined) {
    attrs.iac_blueprint_id = iac.iac_blueprint_id;
  }
  if (iac.iac_blueprint_version !== undefined) {
    attrs.iac_blueprint_version = iac.iac_blueprint_version;
  }
  if (iac.iac_deployment_id !== undefined) {
    attrs.iac_deployment_id = iac.iac_deployment_id;
  }

  return attrs;
};

export interface CloudConnectorServiceInterface {
  create(
    soClient: SavedObjectsClientContract,
    cloudConnector: CreateCloudConnectorRequest
  ): Promise<CloudConnector>;
  getList(
    soClient: SavedObjectsClientContract,
    options?: Omit<CloudConnectorListOptions, 'fields'>
  ): Promise<CloudConnector[]>;
  getList(
    soClient: SavedObjectsClientContract,
    options: CloudConnectorListOptions & { fields: string[] }
  ): Promise<Partial<CloudConnector>[]>;
  getById(soClient: SavedObjectsClientContract, cloudConnectorId: string): Promise<CloudConnector>;
  update(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string,
    cloudConnectorUpdate: Partial<UpdateCloudConnectorRequest>,
    options?: { esClient?: ElasticsearchClient }
  ): Promise<CloudConnector>;
  delete(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    cloudConnectorId: string,
    force?: boolean
  ): Promise<{ id: string }>;
}

export class CloudConnectorService implements CloudConnectorServiceInterface {
  private static readonly EXTERNAL_ID_REGEX = /^[a-zA-Z0-9_-]{20}$/;

  protected getLogger(...childContextPaths: string[]): Logger {
    return appContextService.getLogger().get('CloudConnectorService', ...childContextPaths);
  }

  /**
   * Normalizes a cloud connector name by trimming and collapsing consecutive spaces
   * @param name - The name to normalize
   * @returns The normalized name
   */
  private static normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  /** Trims an AWS Role ARN, which is often pasted with surrounding whitespace. */
  private static normalizeRoleArn(
    cloudProvider: string,
    vars: CloudConnectorVars
  ): CloudConnectorVars {
    if (cloudProvider !== 'aws' || !('role_arn' in vars)) {
      return vars;
    }
    const { role_arn: roleArn } = vars;
    if (typeof roleArn?.value !== 'string') {
      return vars;
    }
    return { ...vars, role_arn: { ...roleArn, value: roleArn.value.trim() } };
  }

  /**
   * Queries package policies to get a map of cloud connector IDs to their
   * user-visible package policy counts. Hidden internal packages (e.g. verifier_otel)
   * and non-latest revisions (e.g. `:prev` rollback snapshots) are excluded in the
   * saved-objects filter. Uses a terms aggregation (see `package_policies_aggregation`).
   * `size` matches {@link SO_SEARCH_LIMIT} so bucket count is not capped at ES default (10).
   */
  private async getPackagePolicyCountsMap(
    soClient: SavedObjectsClientContract
  ): Promise<Map<string, number>> {
    const logger = this.getLogger('getPackagePolicyCountsMap');

    try {
      const filter = buildPackagePolicyFilterExcludingHiddenPackages(
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:*`
      );

      const res = await soClient.find<
        Record<string, unknown>,
        {
          count_by_cloud_connector: {
            buckets: Array<{ key: string; doc_count: number }>;
          };
        }
      >({
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        perPage: 0,
        filter,
        aggs: {
          count_by_cloud_connector: {
            terms: {
              field: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id`,
              size: SO_SEARCH_LIMIT,
            },
          },
        },
      });

      const countMap = new Map<string, number>();
      for (const bucket of res.aggregations?.count_by_cloud_connector?.buckets ?? []) {
        countMap.set(bucket.key, bucket.doc_count);
      }
      return countMap;
    } catch (error) {
      logger.error(`Failed to get package policy counts: ${error.message}`);
      return new Map();
    }
  }

  /**
   * Gets the package policy count for a specific cloud connector.
   * @param soClient - Saved objects client
   * @param cloudConnectorId - ID of the cloud connector
   * @returns The number of package policies using this cloud connector
   */
  private async getPackagePolicyCount(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string
  ): Promise<number> {
    const logger = this.getLogger('getPackagePolicyCount');

    try {
      const filter = buildPackagePolicyFilterExcludingHiddenPackages(
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.cloud_connector_id:"${cloudConnectorId}"`
      );

      const result = await soClient.find({
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        filter,
        page: 1,
        perPage: 0,
      });

      return result.total;
    } catch (error) {
      logger.error(
        `Failed to get package policy count for connector ${cloudConnectorId}: ${error.message}`
      );
      return 0;
    }
  }

  /**
   * Validates and normalizes a cloud connector name, checking for duplicates
   * @param soClient - Saved objects client
   * @param name - The name to validate
   * @param excludeId - Optional cloud connector ID to exclude from duplicate check (for updates)
   * @returns The normalized name
   * @throws CloudConnectorCreateError if a duplicate name is found
   */
  private async validateAndNormalizeName(
    soClient: SavedObjectsClientContract,
    name: string,
    excludeId?: string
  ): Promise<string> {
    const normalizedName = CloudConnectorService.normalizeName(name);

    // Check for existing connector with same name (case-insensitive, normalized)
    const existingConnectors = await this.getList(soClient, {
      perPage: SO_SEARCH_LIMIT,
      fields: ['name'],
    });
    const normalizedNameLower = normalizedName.toLowerCase();
    const duplicateConnectorName = existingConnectors.find((c) => {
      // Skip the current connector when updating
      if (excludeId && c.id === excludeId) {
        return false;
      }
      // c.name is guaranteed to exist since we requested the 'name' field
      return (
        c.name && CloudConnectorService.normalizeName(c.name).toLowerCase() === normalizedNameLower
      );
    });

    if (duplicateConnectorName) {
      throw new CloudConnectorCreateError('A cloud connector with this name already exists');
    }

    return normalizedName;
  }

  async create(
    soClient: SavedObjectsClientContract,
    cloudConnectorRequest: CreateCloudConnectorRequest
  ): Promise<CloudConnector> {
    const logger = this.getLogger('create');

    try {
      logger.info('Creating cloud connector');
      const cloudConnector: CreateCloudConnectorRequest = {
        ...cloudConnectorRequest,
        vars:
          cloudConnectorRequest.vars &&
          CloudConnectorService.normalizeRoleArn(
            cloudConnectorRequest.cloudProvider,
            cloudConnectorRequest.vars
          ),
      };
      this.validateCloudConnectorDetails(cloudConnector);

      const { vars, cloudProvider } = cloudConnector;

      if (!vars || Object.keys(vars).length === 0) {
        logger.error(`Package policy must contain ${cloudProvider} input vars`);
        throw new CloudConnectorCreateError(
          `CloudConnectorService Package policy must contain ${cloudProvider} input vars`
        );
      }

      // Validate and normalize the name, checking for duplicates
      const name = await this.validateAndNormalizeName(soClient, cloudConnector.name);

      const namespace = cloudConnector.namespace ?? '*';

      if (namespace) {
        await validatePolicyNamespaceForSpace({
          namespace,
          spaceId: soClient.getCurrentNamespace(),
        });
      }

      const cloudConnectorAttributes: CloudConnectorSOAttributes = {
        name,
        namespace,
        cloudProvider,
        accountType: cloudConnector.accountType,
        vars,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        verification_status: 'pending',
        ...iacAttributesFromConfirm(cloudConnector),
      };

      const savedObject = await soClient.create<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorAttributes
      );

      logger.info('Successfully created cloud connector');

      return {
        id: savedObject.id,
        ...savedObject.attributes,
        packagePolicyCount: 0,
      };
    } catch (error) {
      logger.error(`Failed to create cloud connector: ${getErrorMessage(error)}`);
      rethrowIfInstanceOrWrap(
        error,
        CloudConnectorCreateError,
        'CloudConnectorService Failed to create cloud connector'
      );
    }
  }

  // Overload signatures
  async getList(
    soClient: SavedObjectsClientContract,
    options?: Omit<CloudConnectorListOptions, 'fields'>
  ): Promise<CloudConnector[]>;
  async getList(
    soClient: SavedObjectsClientContract,
    options: CloudConnectorListOptions & { fields: string[] }
  ): Promise<Partial<CloudConnector>[]>;
  // Implementation
  async getList(
    soClient: SavedObjectsClientContract,
    options?: CloudConnectorListOptions
  ): Promise<CloudConnector[] | Partial<CloudConnector>[]> {
    const logger = this.getLogger('getList');
    logger.debug('Getting cloud connectors list');

    try {
      const findOptions: any = {
        type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        page: options?.page || 1,
        perPage: options?.perPage || CLOUD_CONNECTOR_LIST_DEFAULT_PER_PAGE,
        sortField: 'created_at',
        sortOrder: 'desc',
      };

      // Add KQL filter if specified
      if (options?.kuery) {
        findOptions.filter = options.kuery;
      }

      // Add fields filter if specified
      if (options?.fields) {
        findOptions.fields = options.fields;
      }

      const cloudConnectors = await soClient.find<CloudConnectorSOAttributes>(findOptions);

      // Only compute package policy counts if we're fetching all fields
      // (not when using fields filter for internal queries like duplicate name checking)
      const shouldComputeCounts = !options?.fields;
      const countMap = shouldComputeCounts
        ? await this.getPackagePolicyCountsMap(soClient)
        : new Map<string, number>();

      logger.debug('Successfully retrieved cloud connectors list');

      // When using fields filter (internal queries), return partial objects
      // When fetching all fields, include computed packagePolicyCount
      return cloudConnectors.saved_objects.map((savedObject) => ({
        id: savedObject.id,
        ...savedObject.attributes,
        ...(shouldComputeCounts && { packagePolicyCount: countMap.get(savedObject.id) || 0 }),
      }));
    } catch (error) {
      logger.error('Failed to get cloud connectors list', error.message);
      throw new CloudConnectorGetListError(
        `Failed to get cloud connectors list: ${error.message}\n${error.stack}`
      );
    }
  }

  async getById(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string
  ): Promise<CloudConnector> {
    const logger = this.getLogger('getById');

    try {
      logger.info(`Getting cloud connector ${cloudConnectorId}`);

      const cloudConnector = await soClient.get<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorId
      );

      // Compute packagePolicyCount dynamically
      const packagePolicyCount = await this.getPackagePolicyCount(soClient, cloudConnectorId);

      logger.info(`Successfully retrieved cloud connector ${cloudConnectorId}`);

      return {
        id: cloudConnector.id,
        ...cloudConnector.attributes,
        packagePolicyCount,
      };
    } catch (error) {
      logger.error('Failed to get cloud connector', error.message);
      throw new CloudConnectorGetListError(
        `Failed to get cloud connector: ${error.message}\n${error.stack}`
      );
    }
  }

  /** Whether the connector is shared with spaces other than one, so a per-space count is partial. */
  async isSharedWithOtherSpaces(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string
  ): Promise<boolean> {
    const { namespaces } = await soClient.get<CloudConnectorSOAttributes>(
      CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      cloudConnectorId
    );
    return isConnectorSharedAcrossSpaces(namespaces);
  }

  async update(
    soClient: SavedObjectsClientContract,
    cloudConnectorId: string,
    cloudConnectorUpdate: Partial<UpdateCloudConnectorRequest>,
    options?: {
      esClient?: ElasticsearchClient;
      user?: AuthenticatedUser;
      /**
       * Set by the HTTP handler from the caller's Fleet authz. Omitted by internal callers
       * (package-policy create) that already passed integration-policy write. `false` blocks a
       * Role ARN change; connector-only edits are unaffected.
       */
      canWriteIntegrationPolicies?: boolean;
      /** Present on the HTTP path so a shared connector can be authorized in every space. */
      request?: KibanaRequest;
      /** Resolves concrete space ids when the connector is shared into all spaces. */
      listSpaces?: () => Promise<Array<{ id: string }>>;
      /**
       * Set when a new package policy attaches to this connector: the stored Role ARN replaces the
       * incoming one, so attaching never edits the identity or fans out.
       */
      keepStoredRoleArn?: boolean;
    }
  ): Promise<CloudConnector> {
    const logger = this.getLogger('update');

    try {
      logger.info(`Updating cloud connector ${cloudConnectorId}`);

      // Get existing cloud connector
      const existingCloudConnector = await soClient.get<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorId
      );

      const isAws = existingCloudConnector.attributes.cloudProvider === 'aws';
      const existingAwsVars = existingCloudConnector.attributes.vars as
        | AwsCloudConnectorVars
        | undefined;
      const storedRoleArnVar = existingAwsVars?.role_arn;
      const requestedVars =
        cloudConnectorUpdate.vars &&
        CloudConnectorService.normalizeRoleArn(
          existingCloudConnector.attributes.cloudProvider,
          cloudConnectorUpdate.vars
        );
      const incomingVars =
        options?.keepStoredRoleArn && isAws && storedRoleArnVar && requestedVars
          ? { ...requestedVars, role_arn: storedRoleArnVar }
          : requestedVars;

      // Validate the vars that will be written, after any stored Role ARN replaced the incoming one
      if (incomingVars) {
        const tempCloudConnector = {
          name: cloudConnectorUpdate.name || existingCloudConnector.attributes.name,
          vars: incomingVars,
          cloudProvider: existingCloudConnector.attributes.cloudProvider,
        };
        this.validateCloudConnectorDetails(tempCloudConnector);
      }

      // Prepare update attributes
      const updateAttributes: Partial<CloudConnectorSOAttributes> = {
        updated_at: new Date().toISOString(),
      };

      // Validate and normalize name if provided, checking for duplicates (excluding current connector)
      if (cloudConnectorUpdate.name) {
        updateAttributes.name = await this.validateAndNormalizeName(
          soClient,
          cloudConnectorUpdate.name,
          cloudConnectorId
        );
      }

      if (cloudConnectorUpdate.accountType !== undefined) {
        updateAttributes.accountType = cloudConnectorUpdate.accountType;
      }

      Object.assign(updateAttributes, iacAttributesFromConfirm(cloudConnectorUpdate));

      const incomingAwsVars = incomingVars as AwsCloudConnectorVars | undefined;
      const oldRoleArn = existingAwsVars?.role_arn?.value;
      const newRoleArn = incomingAwsVars?.role_arn?.value;
      const roleArnChanged = isAws && typeof newRoleArn === 'string' && newRoleArn !== oldRoleArn;
      const esClient = options?.esClient;
      const user = options?.user;

      if (roleArnChanged && options?.canWriteIntegrationPolicies === false) {
        throw new FleetUnauthorizedError(
          'Role ARN updates require permission to write integration policies.'
        );
      }

      // Role ARN edits (API or flyout) may send only `{ role_arn }`, including a retry that
      // does not change the value. A wholesale replace would orphan `external_id`'s Fleet
      // secret and break later auth. Merge those role-only payloads; other vars updates stay
      // a full replace (package-policy create/update depends on that contract).
      const incomingVarKeys = incomingAwsVars ? Object.keys(incomingAwsVars) : [];
      const isRoleOnlyPayload =
        isAws &&
        typeof newRoleArn === 'string' &&
        incomingVarKeys.length > 0 &&
        incomingVarKeys.every((key) => key === 'role_arn');
      const mergeIncomingVars = (storedVars: CloudConnectorSOAttributes['vars'] | undefined) =>
        isRoleOnlyPayload && storedVars ? { ...storedVars, ...incomingVars } : incomingVars;
      if (incomingVars) {
        updateAttributes.vars = mergeIncomingVars(existingCloudConnector.attributes.vars);
      }

      let roleArnRollback: RoleArnPropagationRollback | undefined;
      let connectorVersion = existingCloudConnector.version;
      if (roleArnChanged) {
        if (!esClient) {
          logger.error(
            `Role ARN change requested for connector ${cloudConnectorId} but no esClient was provided; cannot fan out.`
          );
          throw new CloudConnectorCreateError(
            'Role ARN update is not supported from this code path (missing esClient for package-policy fan-out).'
          );
        }
      }

      async function fanOutRoleArnChange(
        targetRoleArn: string,
        sharedNamespaces: string[] | undefined
      ) {
        if (!esClient) {
          throw new CloudConnectorCreateError(
            'Role ARN update is not supported from this code path (missing esClient for package-policy fan-out).'
          );
        }
        if (isConnectorSharedAcrossSpaces(sharedNamespaces)) {
          const currentSpaceId = soClient.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
          const spaceIds = await authorizeSharedConnectorRoleArnSpaces({
            currentSpaceId,
            namespaces: sharedNamespaces,
            request: options?.request,
            listSpaces: options?.listSpaces,
          });
          const rollbacks: RoleArnPropagationRollback[] = [];
          try {
            for (const spaceId of spaceIds) {
              const spaceClient =
                spaceId === currentSpaceId ? soClient : soClient.asScopedToNamespace(spaceId);
              const rollback = await propagateRoleArnToPackagePolicies({
                soClient: spaceClient,
                esClient,
                connectorId: cloudConnectorId,
                newRoleArn: targetRoleArn,
                user,
              });
              if (rollback) {
                rollbacks.push(rollback);
              }
            }
          } catch (fanOutError) {
            const revertErrors = await revertEveryRollback(rollbacks, (revertError) =>
              logger.error(
                `Failed to revert a Role ARN fan-out for connector ${cloudConnectorId} after a later space failed: ${getErrorMessage(
                  revertError
                )}`
              )
            );
            if (revertErrors.length > 0) {
              const fanOutDetail =
                fanOutError instanceof CloudConnectorRoleArnPropagationError
                  ? fanOutError.detail
                  : undefined;
              const earlierSpaces = collectRevertFailures(revertErrors);
              const fanOutMessage =
                fanOutError instanceof Error ? fanOutError.message : String(fanOutError);
              throw new CloudConnectorRoleArnPropagationError(
                `Role ARN fan-out failed (${fanOutMessage}) and reverting an earlier space also failed`,
                {
                  updateFailed: fanOutDetail?.updateFailed ?? [],
                  revertFailed: [
                    ...(fanOutDetail?.revertFailed ?? []),
                    ...earlierSpaces.revertFailed,
                  ],
                  bumpFailed: Boolean(fanOutDetail?.bumpFailed) || earlierSpaces.bumpFailed,
                }
              );
            }
            throw fanOutError;
          }
          if (rollbacks.length > 0) {
            roleArnRollback = {
              policyCount: rollbacks.reduce((count, rollback) => count + rollback.policyCount, 0),
              async revert() {
                const revertErrors = await revertEveryRollback(rollbacks, (revertError) =>
                  logger.error(
                    `Failed to revert a Role ARN fan-out in one space for connector ${cloudConnectorId}: ${getErrorMessage(
                      revertError
                    )}`
                  )
                );
                if (revertErrors.length > 0) {
                  throw new CloudConnectorRoleArnPropagationError(
                    `Reverting the Role ARN failed in ${revertErrors.length} of ${rollbacks.length} spaces`,
                    { updateFailed: [], ...collectRevertFailures(revertErrors) }
                  );
                }
              },
            };
          }
        } else {
          roleArnRollback = await propagateRoleArnToPackagePolicies({
            soClient,
            esClient,
            connectorId: cloudConnectorId,
            newRoleArn: targetRoleArn,
            user,
          });
        }
        // The verifier treats a connector updated in the last few minutes as due, so the
        // previous verification timestamps can stay until it stamps new ones.
        updateAttributes.verification_status = 'pending';
      }

      async function commitConnectorUpdate() {
        try {
          // OCC: the fan-out can take long enough for a concurrent connector edit to land. Without
          // the version from the opening get(), that edit is silently overwritten — and we would
          // keep the policies on the new ARN while another writer already changed the connector.
          return connectorVersion !== undefined
            ? await soClient.update<CloudConnectorSOAttributes>(
                CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
                cloudConnectorId,
                updateAttributes,
                { version: connectorVersion }
              )
            : await soClient.update<CloudConnectorSOAttributes>(
                CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
                cloudConnectorId,
                updateAttributes
              );
        } catch (writeError) {
          // A concurrent request that already committed this same ARN has no rollback plan of its
          // own (its fan-out was a no-op). Reverting ours would put policies back on the old ARN
          // while the connector stays on the new one.
          let skipRoleArnRevert = false;
          if (roleArnRollback && SavedObjectsErrorHelpers.isConflictError(writeError)) {
            try {
              const current = await soClient.get<CloudConnectorSOAttributes>(
                CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
                cloudConnectorId
              );
              const committedRoleArn = (
                current.attributes.vars as AwsCloudConnectorVars | undefined
              )?.role_arn?.value;
              if (committedRoleArn === newRoleArn) {
                skipRoleArnRevert = true;
                logger.warn(
                  `Connector ${cloudConnectorId} write conflicted, but the stored role ARN is already the requested value; leaving the fan-out in place.`
                );
              }
            } catch (readError) {
              logger.error(
                `Could not re-read connector ${cloudConnectorId} after a version conflict; reverting the role ARN fan-out.`,
                readError
              );
            }
          }
          if (roleArnRollback && !skipRoleArnRevert) {
            logger.error(
              `Connector ${cloudConnectorId} write failed after successful role ARN fan-out; reverting policies.`,
              writeError
            );
            try {
              await roleArnRollback.revert();
            } catch (revertError) {
              logger.error(
                `Revert after failed connector write also failed for ${cloudConnectorId}`,
                revertError
              );
              // Prefer the structured policy-id lists over the bare SO write error — without
              // them operators cannot tell which policies are still on the new ARN.
              if (revertError instanceof CloudConnectorRoleArnPropagationError) {
                const writeMessage =
                  writeError instanceof Error ? writeError.message : String(writeError);
                throw new CloudConnectorRoleArnPropagationError(
                  `Cloud connector write failed (${writeMessage}); role ARN rollback also failed: ${revertError.message}`,
                  revertError.detail
                );
              }
            }
          }
          throw writeError;
        }
      }

      // Only a role-only payload is rebuilt from the connector read under the lock. Anything else
      // in this update was prepared from the opening read and must not overwrite a newer edit.
      const changesOnlyRoleArn =
        isRoleOnlyPayload &&
        Object.keys(updateAttributes).every((key) => key === 'updated_at' || key === 'vars');

      const updatedSavedObject = roleArnChanged
        ? await pRetry(
            () =>
              appContextService
                .getLockManagerService()!
                .withLock(`fleet-cloud-connector-role-arn-${cloudConnectorId}`, async () => {
                  const locked = await soClient.get<CloudConnectorSOAttributes>(
                    CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
                    cloudConnectorId
                  );
                  // Another request may have rotated `external_id` or shared the connector into
                  // another space since the opening read; the write and the fan-out follow the
                  // connector as it is now.
                  if (locked.version !== existingCloudConnector.version) {
                    if (!changesOnlyRoleArn) {
                      throw SavedObjectsErrorHelpers.createConflictError(
                        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
                        cloudConnectorId
                      );
                    }
                    connectorVersion = locked.version ?? connectorVersion;
                  }
                  if (incomingVars) {
                    updateAttributes.vars = mergeIncomingVars(locked.attributes.vars);
                  }
                  const lockedRoleArn = (
                    locked.attributes.vars as AwsCloudConnectorVars | undefined
                  )?.role_arn?.value;
                  if (lockedRoleArn !== newRoleArn) {
                    await fanOutRoleArnChange(newRoleArn, locked.namespaces);
                  } else {
                    logger.info(
                      `Connector ${cloudConnectorId} already stores the requested Role ARN; leaving its policies unchanged.`
                    );
                  }
                  return commitConnectorUpdate();
                }),
            {
              onFailedAttempt: (error) => {
                if (!(error instanceof LockAcquisitionError)) {
                  throw error;
                }
              },
              minTimeout: 100,
              factor: 2,
              maxTimeout: 2_000,
              retries: 100,
              maxRetryTime: 60_000,
            }
          )
        : await commitConnectorUpdate();

      logger.info(`Successfully updated cloud connector ${cloudConnectorId}`);

      // The verifier runs every 12h, so without this a new Role ARN could stay unverified for
      // that long. Best effort: the connector is already saved as pending either way.
      if (
        updateAttributes.verification_status === 'pending' &&
        appContextService.getExperimentalFeatures()?.enableOTelVerifier
      ) {
        appContextService
          .getTaskManagerStart()
          ?.runSoon(VERIFY_PERMISSIONS_TASK_ID)
          .catch((runSoonError) =>
            logger.debug(
              `Could not run the permission verifier soon after updating connector ${cloudConnectorId}: ${getErrorMessage(
                runSoonError
              )}`
            )
          );
      }

      const packagePolicyCount = await this.getPackagePolicyCount(soClient, cloudConnectorId);

      // Return the updated cloud connector with merged attributes
      const mergedAttributes = {
        ...existingCloudConnector.attributes,
        ...updatedSavedObject.attributes,
      };

      return {
        id: cloudConnectorId,
        ...mergedAttributes,
        packagePolicyCount,
      };
    } catch (error) {
      logger.error(`Failed to update cloud connector: ${getErrorMessage(error)}`);
      if (
        error instanceof CloudConnectorRoleArnPropagationError ||
        error instanceof FleetUnauthorizedError ||
        SavedObjectsErrorHelpers.isConflictError(error)
      ) {
        // Keep the saved-object conflict intact so the route can return 409. Wrapping it as a
        // generic update error makes a retryable OCC race look like a validation failure.
        throw error;
      }
      rethrowIfInstanceOrWrap(error, CloudConnectorCreateError, 'Failed to update cloud connector');
    }
  }

  async delete(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    cloudConnectorId: string,
    force: boolean = false
  ): Promise<{ id: string }> {
    const logger = this.getLogger('delete');

    try {
      logger.info(`Deleting cloud connector ${cloudConnectorId} (force: ${force})`);

      // First, get the cloud connector to get its name for error messages
      const cloudConnector = await soClient.get<CloudConnectorSOAttributes>(
        CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        cloudConnectorId
      );

      // Query actual package policy count dynamically (source of truth)
      const packagePolicyCount = await this.getPackagePolicyCount(soClient, cloudConnectorId);

      // Check if cloud connector is still in use by package policies (unless force is true)
      if (!force && packagePolicyCount > 0) {
        const errorMessage = `Cannot delete cloud connector "${cloudConnector.attributes.name}" as it is being used by ${packagePolicyCount} package policies`;
        logger.error(errorMessage);
        throw new CloudConnectorDeleteError(errorMessage);
      }

      // Log a warning if force deleting a connector that's still in use
      if (force && packagePolicyCount > 0) {
        logger.warn(
          `Force deleting cloud connector "${cloudConnector.attributes.name}" which is still being used by ${packagePolicyCount} package policies`
        );
      }

      // Extract and delete secrets before deleting the cloud connector
      try {
        const secretIds = extractSecretIdsFromCloudConnectorVars(
          cloudConnector.attributes.cloudProvider,
          cloudConnector.attributes.vars
        );

        if (secretIds.length > 0) {
          logger.debug(
            `Deleting ${secretIds.length} secret(s) associated with cloud connector ${cloudConnectorId}`
          );
          await deleteSecrets({ esClient, ids: secretIds });
          logger.info(
            `Successfully deleted ${secretIds.length} secret(s) for cloud connector ${cloudConnectorId}`
          );
        } else {
          logger.debug(`No secrets to delete for cloud connector ${cloudConnectorId}`);
        }
      } catch (secretError) {
        // Log the error but don't fail the deletion
        logger.warn(
          `Failed to delete secrets for cloud connector ${cloudConnectorId}: ${secretError.message}`,
          secretError
        );
      }

      // Delete the cloud connector
      await soClient.delete(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, cloudConnectorId);

      logger.info(`Successfully deleted cloud connector ${cloudConnectorId}`);

      return {
        id: cloudConnectorId,
      };
    } catch (error) {
      logger.error('Failed to delete cloud connector', error.message);

      // Re-throw CloudConnectorDeleteError as-is to preserve the original error message
      if (error instanceof CloudConnectorDeleteError) {
        throw error;
      }

      throw new CloudConnectorDeleteError(
        `Failed to delete cloud connector: ${error.message}\n${error.stack}`
      );
    }
  }

  private validateCloudConnectorDetails(cloudConnector: CreateCloudConnectorRequest) {
    const logger = this.getLogger('validate cloud connector details');
    const vars = cloudConnector.vars;

    if (cloudConnector.cloudProvider === 'aws') {
      // Type assertion is safe here because we perform runtime validation below
      const awsVars = vars as AwsCloudConnectorVars;
      const roleArn = awsVars.role_arn?.value;
      if (!roleArn) {
        logger.error('Package policy must contain role_arn variable');
        throw new CloudConnectorInvalidVarsError('Package policy must contain role_arn variable');
      }
      if (typeof roleArn !== 'string' || !isIamRoleArn(roleArn)) {
        logger.error('role_arn variable is not a valid IAM role ARN');
        throw new CloudConnectorInvalidVarsError(
          'role_arn must be a valid IAM role ARN (arn:<partition>:iam::<account>:role/<name>)'
        );
      }

      // external_id is optional for AWS. When present, it must be a valid
      // secret reference.
      if (awsVars.external_id !== undefined) {
        const externalIdValue = awsVars.external_id?.value;
        const externalId: CloudConnectorSecretReference | undefined =
          isCloudConnectorSecretReference(externalIdValue) ? externalIdValue : undefined;
        if (!externalId) {
          logger.error('Package policy must contain valid external_id secret reference');
          throw new CloudConnectorInvalidVarsError(
            'Package policy must contain valid external_id secret reference'
          );
        }

        const isValidExternalId =
          externalId?.id &&
          externalId?.isSecretRef &&
          CloudConnectorService.EXTERNAL_ID_REGEX.test(externalId.id);

        if (!isValidExternalId) {
          logger.error('External ID secret reference must be a valid secret reference');
          throw new CloudConnectorInvalidVarsError('External ID secret reference is not valid');
        }
      }
    } else if (cloudConnector.cloudProvider === 'azure') {
      // Type assertion is safe here because we perform runtime validation below
      const azureVars = vars as AzureCloudConnectorVars;
      // Validate that all required Azure fields have valid secret references
      const tenantId = azureVars.tenant_id;
      const clientId = azureVars.client_id;
      const azureCredentials = azureVars.azure_credentials_cloud_connector_id;

      if (!tenantId?.value?.id || !tenantId?.value?.isSecretRef) {
        logger.error(`Package policy must contain valid ${TENANT_ID_VAR_NAME} secret reference`);
        throw new CloudConnectorInvalidVarsError(
          `${TENANT_ID_VAR_NAME} must be a valid secret reference`
        );
      }

      if (!clientId?.value?.id || !clientId?.value?.isSecretRef) {
        logger.error(`Package policy must contain valid ${CLIENT_ID_VAR_NAME} secret reference`);
        throw new CloudConnectorInvalidVarsError(
          `${CLIENT_ID_VAR_NAME} must be a valid secret reference`
        );
      }

      if (!azureCredentials?.value) {
        logger.error(
          `Package policy must contain valid ${AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID} value`
        );
        throw new CloudConnectorInvalidVarsError(
          `${AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID} must be a valid string`
        );
      }
    } else if (cloudConnector.cloudProvider === 'gcp') {
      const gcpVars = vars as GcpCloudConnectorVars;
      // service_account and audience are non-secret text fields;
      // only gcp_credentials_cloud_connector_id is a secret reference
      const serviceAccount = gcpVars.service_account;
      const audience = gcpVars.audience;
      const gcpCredentials = gcpVars.gcp_credentials_cloud_connector_id;

      if (!serviceAccount?.value) {
        logger.error(`Package policy must contain valid ${SERVICE_ACCOUNT_VAR_NAME} value`);
        throw new CloudConnectorInvalidVarsError(
          `${SERVICE_ACCOUNT_VAR_NAME} must be a valid string`
        );
      }

      if (!audience?.value) {
        logger.error(`Package policy must contain valid ${AUDIENCE_VAR_NAME} value`);
        throw new CloudConnectorInvalidVarsError(`${AUDIENCE_VAR_NAME} must be a valid string`);
      }

      if (!gcpCredentials?.value) {
        logger.error(
          `Package policy must contain valid ${GCP_CREDENTIALS_CLOUD_CONNECTOR_ID} value`
        );
        throw new CloudConnectorInvalidVarsError(
          `${GCP_CREDENTIALS_CLOUD_CONNECTOR_ID} must be a valid string`
        );
      }
    } else {
      logger.error(`Unsupported cloud provider: ${cloudConnector.cloudProvider}`);
      throw new CloudConnectorCreateError(
        `Unsupported cloud provider: ${cloudConnector.cloudProvider}`
      );
    }
  }
}

export const cloudConnectorService = new CloudConnectorService();
