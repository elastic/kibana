/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, isEqual, keyBy, omit, pick, uniq } from 'lodash';
import { v5 as uuidv5 } from 'uuid';
import { dump } from 'js-yaml';
import pMap from 'p-map';
import { lt } from 'semver';
import type {
  AuthenticatedUser,
  ElasticsearchClient,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsUpdateResponse,
  SavedObjectsFindOptions,
  Logger,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';

import type { BulkResponseItem } from '@elastic/elasticsearch/lib/api/types';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import type { SavedObjectError } from '@kbn/core-saved-objects-common';

import { withSpan } from '@kbn/apm-utils';

import { catchAndSetErrorStackTrace } from '../errors/utils';

import {
  getAllowedOutputTypesForAgentPolicy,
  packageToPackagePolicy,
  policyHasAPMIntegration,
  policyHasEndpointSecurity,
  policyHasFleetServer,
  policyHasSyntheticsIntegration,
} from '../../common/services';

import type { HTTPAuthorizationHeader } from '../../common/http_authorization_header';

import {
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  AGENTS_PREFIX,
  FLEET_AGENT_POLICIES_SCHEMA_VERSION,
  PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../constants';
import type {
  AgentPolicy,
  AgentPolicySOAttributes,
  ExternalCallback,
  FullAgentPolicy,
  ListWithKuery,
  NewAgentPolicy,
  NewPackagePolicy,
  PackagePolicy,
  PackagePolicySOAttributes,
  PostAgentPolicyCreateCallback,
  PostAgentPolicyUpdateCallback,
  PreconfiguredAgentPolicy,
  OutputsForAgentPolicy,
  PostAgentPolicyPostUpdateCallback,
} from '../types';
import {
  AGENT_POLICY_INDEX,
  agentPolicyStatuses,
  FLEET_ELASTIC_AGENT_PACKAGE,
  UUID_V5_NAMESPACE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type {
  DeleteAgentPolicyResponse,
  FetchAllAgentPoliciesOptions,
  FetchAllAgentPolicyIdsOptions,
  FleetServerPolicy,
  IntegrationsOutput,
  PackageInfo,
} from '../../common/types';
import {
  AgentPolicyNameExistsError,
  AgentPolicyNotFoundError,
  AgentPolicyInvalidError,
  FleetError,
  FleetUnauthorizedError,
  HostedAgentPolicyRestrictionRelatedError,
  PackagePolicyRestrictionRelatedError,
  AgentlessPolicyExistsRequestError,
  OutputNotFoundError,
  FleetNotFoundError,
} from '../errors';

import type { FullAgentConfigMap } from '../../common/types/models/agent_cm';

import { fullAgentConfigMapToYaml } from '../../common/services/agent_cm_to_yaml';

import {
  MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
  MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_20,
} from '../constants';

import { appContextService } from '.';

import { mapAgentPolicySavedObjectToAgentPolicy } from './agent_policies/utils';

import {
  elasticAgentManagedManifest,
  elasticAgentStandaloneManifest,
} from './elastic_agent_manifest';

import { bulkInstallPackages } from './epm/packages';
import { getAgentsByKuery } from './agents';
import { getPackagePolicySavedObjectType, packagePolicyService } from './package_policy';
import { incrementPackagePolicyCopyName } from './package_policies';
import { outputService } from './output';
import { agentPolicyUpdateEventHandler } from './agent_policy_update';
import { escapeSearchQueryPhrase, normalizeKuery as _normalizeKuery } from './saved_object';
import {
  getFullAgentPolicy,
  validateOutputForPolicy,
  validateRequiredVersions,
} from './agent_policies';
import { auditLoggingService } from './audit_logging';
import { licenseService } from './license';
import { createSoFindIterable } from './utils/create_so_find_iterable';
import { isAgentlessEnabled } from './utils/agentless';
import { validatePolicyNamespaceForSpace } from './spaces/policy_namespaces';
import { isSpaceAwarenessEnabled } from './spaces/helpers';
import { agentlessAgentService } from './agents/agentless_agent';
import { scheduleDeployAgentPoliciesTask } from './agent_policies/deploy_agent_policies_task';

const KEY_EDITABLE_FOR_MANAGED_POLICIES = ['namespace'];

function normalizeKuery(savedObjectType: string, kuery: string) {
  if (savedObjectType === LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE) {
    return _normalizeKuery(
      savedObjectType,
      kuery.replace(
        new RegExp(`${AGENT_POLICY_SAVED_OBJECT_TYPE}\\.`, 'g'),
        `${savedObjectType}.attributes.`
      )
    );
  } else {
    return _normalizeKuery(
      savedObjectType,
      kuery.replace(
        new RegExp(`${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}\\.`, 'g'),
        `${savedObjectType}.attributes.`
      )
    );
  }
}

export async function getAgentPolicySavedObjectType() {
  return (await isSpaceAwarenessEnabled())
    ? AGENT_POLICY_SAVED_OBJECT_TYPE
    : LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE;
}

class AgentPolicyService {
  protected getLogger(...childContextPaths: string[]): Logger {
    return appContextService.getLogger().get('AgentPolicyService', ...childContextPaths);
  }

  private triggerAgentPolicyUpdatedEvent = async (
    esClient: ElasticsearchClient,
    action: 'created' | 'updated' | 'deleted',
    agentPolicyId: string,
    options?: { skipDeploy?: boolean; spaceId?: string; agentPolicy?: AgentPolicy | null }
  ) => {
    return agentPolicyUpdateEventHandler(esClient, action, agentPolicyId, options);
  };

  private async _update(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    agentPolicy: Partial<AgentPolicySOAttributes>,
    user?: AuthenticatedUser,
    options: {
      bumpRevision: boolean;
      removeProtection: boolean;
      skipValidation: boolean;
      returnUpdatedPolicy?: boolean;
      asyncDeploy?: boolean;
    } = {
      bumpRevision: true,
      removeProtection: false,
      skipValidation: false,
      returnUpdatedPolicy: true,
      asyncDeploy: false,
    }
  ): Promise<AgentPolicy> {
    const logger = this.getLogger('_update');

    logger.debug(
      `Starting update of agent policy [${id}] with soClient scoped to [${soClient.getCurrentNamespace()}]`
    );

    const savedObjectType = await getAgentPolicySavedObjectType();
    const existingAgentPolicy = await this.get(soClient, id, true);

    auditLoggingService.writeCustomSoAuditLog({
      action: 'update',
      id,
      name: existingAgentPolicy?.name,
      savedObjectType,
    });

    if (!existingAgentPolicy) {
      throw new AgentPolicyNotFoundError('Agent policy not found');
    }

    if (
      existingAgentPolicy.status === agentPolicyStatuses.Inactive &&
      agentPolicy.status !== agentPolicyStatuses.Active
    ) {
      throw new FleetError(
        `Agent policy ${id} cannot be updated because it is ${existingAgentPolicy.status}`
      );
    }

    if (options.removeProtection) {
      logger.warn(`Setting tamper protection for Agent Policy ${id} to false`);
    }

    if (!options.skipValidation) {
      logger.debug(`Validating agent policy [${id}] before update`);

      await validateOutputForPolicy(
        soClient,
        agentPolicy,
        existingAgentPolicy,
        getAllowedOutputTypesForAgentPolicy({ ...existingAgentPolicy, ...agentPolicy })
      );
    }
    await soClient
      .update<AgentPolicySOAttributes>(savedObjectType, id, {
        ...agentPolicy,
        ...(options.bumpRevision ? { revision: existingAgentPolicy.revision + 1 } : {}),
        ...(options.removeProtection
          ? { is_protected: false }
          : { is_protected: agentPolicy.is_protected }),
        updated_at: new Date().toISOString(),
        updated_by: user ? user.username : 'system',
      })
      .catch(catchAndSetErrorStackTrace.withMessage(`SO update to agent policy [${id}] failed`));

    const newAgentPolicy = await this.get(soClient, id, false);

    logger.debug(`Agent policy [${id}] Saved Object was updated successfully`);

    newAgentPolicy!.package_policies = existingAgentPolicy.package_policies;

    if (options.bumpRevision || options.removeProtection) {
      if (!options.asyncDeploy) {
        logger.debug(`Triggering agent policy [${id}] updated event`);

        await this.triggerAgentPolicyUpdatedEvent(esClient, 'updated', id, {
          spaceId: soClient.getCurrentNamespace(),
          agentPolicy: newAgentPolicy,
        });
      } else {
        logger.debug(`Scheduling task to deploy agent policy [${id}]`);

        await scheduleDeployAgentPoliciesTask(appContextService.getTaskManagerStart()!, [
          {
            id,
            spaceId: soClient.getCurrentNamespace(),
          },
        ]);
      }
    }

    logger.debug(
      `Agent policy ${id} update completed, revision: ${
        options.bumpRevision ? existingAgentPolicy.revision + 1 : existingAgentPolicy.revision
      }`
    );

    if (options.returnUpdatedPolicy !== false) {
      logger.debug(`returning updated policy for [${id}]`);
      return (await this.get(soClient, id)) as AgentPolicy;
    }

    return newAgentPolicy as AgentPolicy;
  }

  public async ensurePreconfiguredAgentPolicy(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    config: PreconfiguredAgentPolicy
  ): Promise<{
    created: boolean;
    policy?: AgentPolicy;
  }> {
    const {
      id,
      space_id: kibanaSpaceId,
      ...preconfiguredAgentPolicy
    } = omit(config, 'package_policies');
    const newAgentPolicyDefaults: Pick<NewAgentPolicy, 'namespace' | 'monitoring_enabled'> = {
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
    };

    const newAgentPolicy: NewAgentPolicy = {
      ...newAgentPolicyDefaults,
      ...preconfiguredAgentPolicy,
      is_preconfigured: true,
    };

    if (!id) throw new AgentPolicyNotFoundError('Missing ID');

    return await this.ensureAgentPolicy(soClient, esClient, newAgentPolicy, id as string);
  }

  private async ensureAgentPolicy(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    newAgentPolicy: NewAgentPolicy,
    id: string
  ): Promise<{
    created: boolean;
    policy: AgentPolicy;
  }> {
    // For preconfigured policies with a specified ID
    const agentPolicy = await this.get(soClient, id, false).catch(() => null);
    if (!agentPolicy) {
      return {
        created: true,
        policy: await this.create(soClient, esClient, newAgentPolicy, { id }),
      };
    }
    return {
      created: false,
      policy: agentPolicy,
    };
  }

  public hasAPMIntegration(agentPolicy: AgentPolicy) {
    return policyHasAPMIntegration(agentPolicy);
  }

  public hasFleetServerIntegration(agentPolicy: AgentPolicy) {
    return policyHasFleetServer(agentPolicy);
  }

  public hasSyntheticsIntegration(agentPolicy: AgentPolicy) {
    return policyHasSyntheticsIntegration(agentPolicy);
  }

  public async runExternalCallbacks(
    externalCallbackType: ExternalCallback[0],
    agentPolicy: NewAgentPolicy | Partial<AgentPolicy> | AgentPolicy,
    requestSpaceId?: string
  ): Promise<NewAgentPolicy | Partial<AgentPolicy> | AgentPolicy> {
    const logger = this.getLogger('runExternalCallbacks');
    try {
      const externalCallbacks = appContextService.getExternalCallbacks(externalCallbackType);
      let newAgentPolicy = agentPolicy;

      logger.debug(
        `Running [${externalCallbacks?.size}] external callbacks for [${externalCallbackType}]`
      );

      if (externalCallbacks && externalCallbacks.size > 0) {
        let updatedNewAgentPolicy = newAgentPolicy;
        for (const callback of externalCallbacks) {
          let result;
          if (externalCallbackType === 'agentPolicyCreate') {
            result = await (callback as PostAgentPolicyCreateCallback)(
              newAgentPolicy as NewAgentPolicy
            );
            updatedNewAgentPolicy = result;
          }
          if (externalCallbackType === 'agentPolicyUpdate') {
            result = await (callback as PostAgentPolicyUpdateCallback)(
              newAgentPolicy as Partial<AgentPolicy>
            );
            updatedNewAgentPolicy = result;
          }
          if (externalCallbackType === 'agentPolicyPostUpdate') {
            result = await (callback as PostAgentPolicyPostUpdateCallback)(
              newAgentPolicy as AgentPolicy,
              requestSpaceId
            );
            updatedNewAgentPolicy = result;
          }
        }
        newAgentPolicy = updatedNewAgentPolicy;
      }
      logger.debug(`Running of external callbacks for [${externalCallbackType}] done`);
      return newAgentPolicy;
    } catch (error) {
      logger.error(`Error running external callbacks for [${externalCallbackType}]`);
      logger.error(error);
      throw error;
    }
  }

  public async create(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    agentPolicy: NewAgentPolicy,
    options: {
      id?: string;
      user?: AuthenticatedUser;
      authorizationHeader?: HTTPAuthorizationHeader | null;
      skipDeploy?: boolean;
      hasFleetServer?: boolean;
    } = {}
  ): Promise<AgentPolicy> {
    const logger = this.getLogger('create');

    const savedObjectType = await getAgentPolicySavedObjectType();
    // Ensure an ID is provided, so we can include it in the audit logs below
    if (!options.id) {
      options.id = SavedObjectsUtils.generateId();
    }

    logger.debug(
      `Creating new agent policy [${agentPolicy.name}] with id [${
        options.id
      }] using soClient scoped to [${soClient.getCurrentNamespace()}]`
    );

    auditLoggingService.writeCustomSoAuditLog({
      action: 'create',
      id: options.id,
      name: agentPolicy.name,
      savedObjectType,
    });
    await this.runExternalCallbacks('agentPolicyCreate', agentPolicy);
    this.checkTamperProtectionLicense(agentPolicy);

    if (agentPolicy?.is_protected) {
      logger.warn(
        'Agent policy requires Elastic Defend integration to set tamper protection to true'
      );
    }

    this.checkAgentless(agentPolicy);

    if (agentPolicy.supports_agentless && !agentPolicy.fleet_server_host_id) {
      const { fleetServerId } = agentlessAgentService.getDefaultSettings();
      agentPolicy.fleet_server_host_id = fleetServerId;
    }

    await this.requireUniqueName(soClient, agentPolicy);
    await validatePolicyNamespaceForSpace({
      spaceId: soClient.getCurrentNamespace(),
      namespace: agentPolicy.namespace,
    });
    const policyForOutputValidation = {
      ...agentPolicy,
      has_fleet_server: options?.hasFleetServer,
    };
    await validateOutputForPolicy(
      soClient,
      policyForOutputValidation,
      {},
      getAllowedOutputTypesForAgentPolicy(policyForOutputValidation)
    );

    validateRequiredVersions(agentPolicy.name, agentPolicy.required_versions);

    const newSo = await soClient
      .create<AgentPolicySOAttributes>(
        savedObjectType,
        {
          ...agentPolicy,
          status: 'active',
          is_managed: agentPolicy.is_managed ?? false,
          revision: 1,
          updated_at: new Date().toISOString(),
          updated_by: options?.user?.username || 'system',
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          is_protected: false,
        } as AgentPolicy,
        options
      )
      .catch(
        catchAndSetErrorStackTrace.withMessage(
          `Attempt to create agent policy [${agentPolicy.id}] failed`
        )
      );

    await appContextService
      .getUninstallTokenService()
      ?.scoped(soClient.getCurrentNamespace())
      ?.generateTokenForPolicyId(newSo.id);
    await this.triggerAgentPolicyUpdatedEvent(esClient, 'created', newSo.id, {
      skipDeploy: options.skipDeploy,
      spaceId: soClient.getCurrentNamespace(),
    });
    logger.debug(`Created new agent policy with id ${newSo.id}`);
    return { id: newSo.id, ...newSo.attributes };
  }

  public async requireUniqueName(
    soClient: SavedObjectsClientContract,
    givenPolicy: { id?: string; name: string; supports_agentless?: boolean | null }
  ) {
    const savedObjectType = await getAgentPolicySavedObjectType();

    const results = await soClient
      .find<AgentPolicySOAttributes>({
        type: savedObjectType,
        searchFields: ['name'],
        search: escapeSearchQueryPhrase(givenPolicy.name),
      })
      .catch(
        catchAndSetErrorStackTrace.withMessage(
          `Failed to find agent policies with name [${givenPolicy.name}]`
        )
      );

    const idsWithName = results.total && results.saved_objects.map(({ id }) => id);
    if (Array.isArray(idsWithName)) {
      const isEditingSelf = givenPolicy.id && idsWithName.includes(givenPolicy.id);

      if (
        (!givenPolicy?.supports_agentless && !givenPolicy.id) ||
        (!givenPolicy?.supports_agentless && !isEditingSelf)
      ) {
        const isSinglePolicy = idsWithName.length === 1;
        const existClause = isSinglePolicy
          ? `Agent Policy '${idsWithName[0]}' already exists`
          : `Agent Policies '${idsWithName.join(',')}' already exist`;

        throw new AgentPolicyNameExistsError(`${existClause} with name '${givenPolicy.name}'`);
      }

      if (givenPolicy?.supports_agentless && !givenPolicy.id) {
        const integrationName = givenPolicy.name.split(' ').pop();
        throw new AgentlessPolicyExistsRequestError(
          `${givenPolicy.name} already exist. Please rename the integration name ${integrationName}.`
        );
      }
    }
  }

  public async get(
    soClient: SavedObjectsClientContract,
    id: string,
    withPackagePolicies: boolean = true,
    options: {
      /**
       * The space id of the policy. Note that although this can be set, the `soClient` still
       * needs access to the space to retrieve the agent policy.
       * When using an un-scoped so client (has access to all spaces) and wanting to retrieve data across
       * all space, use a value of `*` (ex. `spaceId: '*'`)
       */
      spaceId?: string;
    } = {}
  ): Promise<AgentPolicy | null> {
    const logger = this.getLogger('get');

    logger.debug(
      () =>
        `Getting agent policy [${id}] for space [${
          options.spaceId ?? soClient.getCurrentNamespace()
        }]`
    );

    // We're using `getByIds()` here, instead of just `soClient.get()`, because when using an unscoped
    // SO client we are not able to use `*` in the `esClient.get()` `options.namespace`.
    const [agentPolicy] = await this.getByIds(soClient, [{ id, spaceId: options.spaceId }], {
      withPackagePolicies,
    }).catch(async (err) => {
      // Emulate prior implementation that threw a Saved Objects error so that backwards compatibility is maintained
      if (err instanceof FleetNotFoundError) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(
          await getAgentPolicySavedObjectType(),
          id
        );
      }

      throw SavedObjectsErrorHelpers.createBadRequestError(err.message);
    });

    return agentPolicy;
  }

  public async getByIds(
    soClient: SavedObjectsClientContract,
    ids: Array<
      | string
      | {
          id: string;
          /**
           * The space id associated with the agent policy. When using an un-scoped SO client, the
           * space id can be set to `*` which will look for that agent policy across all spaces
           */
          spaceId?: string;
        }
    >,
    options: {
      fields?: string[];
      withPackagePolicies?: boolean;
      ignoreMissing?: boolean;
      /** Space ID to be applied to the retrieval of the policies (only used if not already defined as part of `ids` argument) */
      spaceId?: string;
    } = {}
  ): Promise<AgentPolicy[]> {
    const logger = this.getLogger('getByIds');

    logger.debug(
      () =>
        `Getting agent policies ${JSON.stringify(
          ids
        )} using soClient scoped to [${soClient.getCurrentNamespace()}] and options [${JSON.stringify(
          options
        )}]`
    );

    const savedObjectType = await getAgentPolicySavedObjectType();
    const isSpacesEnabled = await isSpaceAwarenessEnabled();

    const objects = ids.map((id) => {
      if (typeof id === 'string') {
        return {
          ...options,
          id,
          type: savedObjectType,
          namespaces: isSpacesEnabled && options.spaceId ? [options.spaceId] : undefined,
        };
      }

      const spaceForThisAgentPolicy = id.spaceId ?? options.spaceId;

      return {
        ...options,
        id: id.id,
        namespaces:
          isSpacesEnabled && spaceForThisAgentPolicy ? [spaceForThisAgentPolicy] : undefined,
        type: savedObjectType,
      };
    });

    logger.debug(() => `BulkGet input: ${JSON.stringify(objects)}`);

    const bulkGetResponse = await soClient
      .bulkGet<AgentPolicySOAttributes>(objects)
      .catch(catchAndSetErrorStackTrace.withMessage(`Failed to get agent policy by IDs`));

    const agentPolicies = await pMap(
      bulkGetResponse.saved_objects,
      async (agentPolicySO) => {
        if (agentPolicySO.error) {
          if (options.ignoreMissing && agentPolicySO.error.statusCode === 404) {
            logger.debug(
              `Agent policy [${agentPolicySO.id}] was not found, but 'options.ignoreMissing' is 'true'`
            );
            return null;
          } else if (agentPolicySO.error.statusCode === 404) {
            logger.debug(`Agent policy [${agentPolicySO.id}] was not found. Throwing error`);
            throw new AgentPolicyNotFoundError(
              `Agent policy ${agentPolicySO.id} not found`,
              agentPolicySO.error
            );
          } else {
            logger.debug(
              `Error encountered while bulkGet agent policy [${agentPolicySO.id}]: ${agentPolicySO.error.message}`
            );
            throw new FleetError(agentPolicySO.error.message, agentPolicySO.error);
          }
        }

        const agentPolicy = mapAgentPolicySavedObjectToAgentPolicy(agentPolicySO);

        if (options.withPackagePolicies) {
          logger.debug(`Retrieving package policies for agent policies [${agentPolicySO.id}]`);

          agentPolicy.package_policies =
            (await packagePolicyService.findAllForAgentPolicy(soClient, agentPolicySO.id)) || [];
        }

        return agentPolicy;
      },
      { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS }
    );

    const result = agentPolicies.filter(
      (agentPolicy): agentPolicy is AgentPolicy => agentPolicy !== null
    );

    for (const agentPolicy of result) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'get',
        id: agentPolicy.id,
        name: agentPolicy.name,
        savedObjectType,
      });
    }

    logger.debug(`returning [${result.length}] agent policies`);

    return result;
  }

  public async list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery & {
      withPackagePolicies?: boolean;
      fields?: string[];
      esClient?: ElasticsearchClient;
      withAgentCount?: boolean;
      spaceId?: string;
    }
  ): Promise<{
    items: AgentPolicy[];
    total: number;
    page: number;
    perPage: number;
  }> {
    const savedObjectType = await getAgentPolicySavedObjectType();

    const {
      page = 1,
      perPage = 20,
      sortField = 'updated_at',
      sortOrder = 'desc',
      kuery,
      withPackagePolicies = false,
      fields,
      spaceId,
    } = options;

    const baseFindParams: SavedObjectsFindOptions = {
      type: savedObjectType,
      sortField,
      sortOrder,
      page,
      perPage,
      ...(fields ? { fields } : {}),
    };

    if (spaceId) {
      baseFindParams.namespaces = [spaceId];
    }

    const filter = kuery ? normalizeKuery(savedObjectType, kuery) : undefined;
    let agentPoliciesSO;
    try {
      agentPoliciesSO = await soClient.find<AgentPolicySOAttributes>({
        ...baseFindParams,
        filter,
      });
    } catch (e) {
      const isBadRequest = e.output?.statusCode === 400;
      const isKQLSyntaxError = e.message?.startsWith('KQLSyntaxError');
      if (isBadRequest && !isKQLSyntaxError) {
        // fall back to simple search if the kuery is just a search term i.e not KQL
        agentPoliciesSO = await soClient
          .find<AgentPolicySOAttributes>({
            ...baseFindParams,
            search: kuery,
          })
          .catch(
            catchAndSetErrorStackTrace.withMessage(
              'Failed to find agent policies using simple search term'
            )
          );
      } else {
        throw e;
      }
    }

    const agentPolicies = agentPoliciesSO.saved_objects.map((agentPolicySO) => {
      const agentPolicy = mapAgentPolicySavedObjectToAgentPolicy(agentPolicySO);
      agentPolicy.agents = 0;
      return agentPolicy;
    });

    if (options.withAgentCount || withPackagePolicies) {
      await pMap(
        agentPolicies,
        async (agentPolicy) => {
          if (withPackagePolicies) {
            agentPolicy.package_policies =
              (await packagePolicyService.findAllForAgentPolicy(soClient, agentPolicy.id)) || [];
          }
          if (options.withAgentCount) {
            await getAgentsByKuery(appContextService.getInternalUserESClient(), soClient, {
              showInactive: true,
              perPage: 0,
              page: 1,
              kuery: `${AGENTS_PREFIX}.policy_id:"${agentPolicy.id}"`,
            }).then(({ total }) => (agentPolicy.agents = total));
          } else {
            agentPolicy.agents = 0;
          }

          return agentPolicy;
        },
        { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS }
      );
    }

    for (const agentPolicy of agentPolicies) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'find',
        id: agentPolicy.id,
        name: agentPolicy.name,
        savedObjectType,
      });
    }

    return {
      items: agentPolicies,
      total: agentPoliciesSO.total,
      page,
      perPage,
    };
  }

  public async update(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    agentPolicy: Partial<AgentPolicy>,
    options?: {
      user?: AuthenticatedUser;
      force?: boolean;
      spaceId?: string;
      authorizationHeader?: HTTPAuthorizationHeader | null;
      skipValidation?: boolean;
      bumpRevision?: boolean;
      requestSpaceId?: string;
    }
  ): Promise<AgentPolicy> {
    const logger = this.getLogger('update');
    logger.debug(`Starting update of agent policy ${id}`);

    if (agentPolicy.name) {
      await this.requireUniqueName(soClient, {
        id,
        name: agentPolicy.name,
        supports_agentless: agentPolicy?.supports_agentless,
      });
    }
    if (agentPolicy.namespace) {
      await validatePolicyNamespaceForSpace({
        spaceId: soClient.getCurrentNamespace(),
        namespace: agentPolicy.namespace,
      });
    }
    validateRequiredVersions(agentPolicy.name ?? id, agentPolicy.required_versions);

    const existingAgentPolicy = await this.get(soClient, id, true);

    if (!existingAgentPolicy) {
      throw new AgentPolicyNotFoundError('Agent policy not found');
    }
    try {
      await this.runExternalCallbacks('agentPolicyUpdate', agentPolicy);
    } catch (error) {
      logger.error(`Error running external callbacks for agentPolicyUpdate`);
      if (error.apiPassThrough) {
        throw error;
      }
    }
    this.checkTamperProtectionLicense(agentPolicy);
    this.checkAgentless(agentPolicy);
    await this.checkForValidUninstallToken(agentPolicy, id);

    if (agentPolicy?.is_protected && !policyHasEndpointSecurity(existingAgentPolicy)) {
      logger.warn(
        'Agent policy requires Elastic Defend integration to set tamper protection to true'
      );
      // force agent policy to be false if elastic defend is not present
      agentPolicy.is_protected = false;
    }

    if (existingAgentPolicy.is_managed && !options?.force) {
      Object.entries(agentPolicy)
        .filter(([key]) => !KEY_EDITABLE_FOR_MANAGED_POLICIES.includes(key))
        .forEach(([key, val]) => {
          if (!isEqual(existingAgentPolicy[key as keyof AgentPolicy], val)) {
            throw new HostedAgentPolicyRestrictionRelatedError(`Cannot update ${key}`);
          }
        });
    }
    const { monitoring_enabled: monitoringEnabled } = agentPolicy;
    const packagesToInstall = [];
    if (!existingAgentPolicy.monitoring_enabled && monitoringEnabled?.length) {
      packagesToInstall.push(FLEET_ELASTIC_AGENT_PACKAGE);
    }
    if (packagesToInstall.length > 0) {
      await bulkInstallPackages({
        savedObjectsClient: soClient,
        esClient,
        packagesToInstall,
        spaceId: options?.spaceId || DEFAULT_SPACE_ID,
        authorizationHeader: options?.authorizationHeader,
        force: options?.force,
      });
    }
    return this._update(soClient, esClient, id, agentPolicy, options?.user, {
      bumpRevision: options?.bumpRevision ?? true,
      removeProtection: false,
      skipValidation: options?.skipValidation ?? false,
    })
      .then((updatedAgentPolicy) => {
        return this.runExternalCallbacks(
          'agentPolicyPostUpdate',
          updatedAgentPolicy,
          options?.requestSpaceId ?? DEFAULT_SPACE_ID
        ) as unknown as AgentPolicy;
      })
      .then((response) => {
        logger.debug(`Update of agent policy [${id}] done`);
        return response;
      });
  }

  public async copy(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    newAgentPolicyProps: Pick<AgentPolicy, 'name' | 'description'>,
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentPolicy> {
    const logger = this.getLogger('copy');
    logger.debug(`Starting copy of agent policy ${id}`);

    // Copy base agent policy
    const baseAgentPolicy = await this.get(soClient, id, true);
    if (!baseAgentPolicy) {
      throw new AgentPolicyNotFoundError('Agent policy not found');
    }
    if (baseAgentPolicy.package_policies?.length) {
      const hasManagedPackagePolicies = baseAgentPolicy.package_policies.some(
        (packagePolicy) => packagePolicy.is_managed
      );
      if (hasManagedPackagePolicies) {
        throw new PackagePolicyRestrictionRelatedError(
          `Cannot copy an agent policy ${id} that contains managed package policies`
        );
      }
    }

    const newAgentPolicy = await this.create(
      soClient,
      esClient,
      {
        ...pick(baseAgentPolicy, [
          'namespace',
          'monitoring_enabled',
          'inactivity_timeout',
          'unenroll_timeout',
          'agent_features',
          'overrides',
          'data_output_id',
          'monitoring_output_id',
          'download_source_id',
          'fleet_server_host_id',
          'supports_agentless',
          'global_data_tags',
          'agentless',
          'monitoring_pprof_enabled',
          'monitoring_http',
          'monitoring_diagnostics',
        ]),
        ...newAgentPolicyProps,
      },
      options
    );

    if (baseAgentPolicy.package_policies) {
      // Copy non-shared package policies and append (copy n) to their names.
      const basePackagePolicies = baseAgentPolicy.package_policies.filter(
        (packagePolicy) => packagePolicy.policy_ids.length < 2
      );
      if (basePackagePolicies.length > 0) {
        const newPackagePolicies = await pMap(
          basePackagePolicies,
          async (packagePolicy: PackagePolicy) => {
            const { id: packagePolicyId, version, ...newPackagePolicy } = packagePolicy;

            const updatedPackagePolicy = {
              ...newPackagePolicy,
              name: await incrementPackagePolicyCopyName(soClient, packagePolicy.name),
            };
            return updatedPackagePolicy;
          }
        );
        await packagePolicyService.bulkCreate(
          soClient,
          esClient,
          newPackagePolicies.map((newPackagePolicy) => ({
            ...newPackagePolicy,
            policy_ids: [newAgentPolicy.id],
          })),
          {
            ...options,
            bumpRevision: false,
          }
        );
      }
      // Link shared package policies to new agent policy.
      const sharedBasePackagePolicies = baseAgentPolicy.package_policies.filter(
        (packagePolicy) => packagePolicy.policy_ids.length > 1
      );
      if (sharedBasePackagePolicies.length > 0) {
        const updatedSharedPackagePolicies = sharedBasePackagePolicies.map((packagePolicy) => ({
          ...packagePolicy,
          policy_ids: [...packagePolicy.policy_ids, newAgentPolicy.id],
        }));
        await packagePolicyService.bulkUpdate(soClient, esClient, updatedSharedPackagePolicies);
      }
    }

    // Tamper protection is dependent on endpoint package policy
    // Match tamper protection setting to the original policy
    if (baseAgentPolicy.is_protected) {
      await this._update(
        soClient,
        esClient,
        newAgentPolicy.id,
        { is_protected: true },
        options?.user,
        {
          bumpRevision: false,
          removeProtection: false,
          skipValidation: false,
        }
      );
    }

    const policyNeedsBump = baseAgentPolicy.package_policies || baseAgentPolicy.is_protected;

    // bump revision if agent policy is updated after creation
    if (policyNeedsBump) {
      await this.bumpRevision(soClient, esClient, newAgentPolicy.id, {
        user: options?.user,
      });
    } else {
      await this.deployPolicy(soClient, newAgentPolicy.id);
    }

    // Get updated agent policy with package policies and adjusted tamper protection
    const updatedAgentPolicy = await this.get(soClient, newAgentPolicy.id, true);
    if (!updatedAgentPolicy) {
      throw new AgentPolicyNotFoundError('Copied agent policy not found');
    }

    logger.debug(`Completed copy of agent policy ${id}`);
    return updatedAgentPolicy;
  }

  public async bumpRevision(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    options?: {
      user?: AuthenticatedUser;
      removeProtection?: boolean;
      asyncDeploy?: boolean;
      skipValidation?: boolean;
    }
  ): Promise<void> {
    return withSpan('bump_agent_policy_revision', async () => {
      await this._update(soClient, esClient, id, {}, options?.user, {
        bumpRevision: true,
        removeProtection: options?.removeProtection ?? false,
        skipValidation: options?.skipValidation ?? true,
        returnUpdatedPolicy: false,
        asyncDeploy: options?.asyncDeploy,
      });
    });
  }

  /**
   * Remove an output from all agent policies that are using it, and replace the output by the default ones.
   * @param esClient
   * @param outputId
   */
  public async removeOutputFromAll(
    esClient: ElasticsearchClient,
    outputId: string,
    options?: { force?: boolean }
  ) {
    const savedObjectType = await getAgentPolicySavedObjectType();
    const agentPolicies = (
      await appContextService
        .getInternalUserSOClientWithoutSpaceExtension()
        .find<AgentPolicySOAttributes>({
          type: savedObjectType,
          fields: ['revision', 'data_output_id', 'monitoring_output_id'],
          searchFields: ['data_output_id', 'monitoring_output_id'],
          search: escapeSearchQueryPhrase(outputId),
          perPage: SO_SEARCH_LIMIT,
          namespaces: ['*'],
        })
    ).saved_objects.map(mapAgentPolicySavedObjectToAgentPolicy);

    if (agentPolicies.length > 0) {
      const getAgentPolicy = (agentPolicy: AgentPolicy) => ({
        data_output_id: agentPolicy.data_output_id === outputId ? null : agentPolicy.data_output_id,
        monitoring_output_id:
          agentPolicy.monitoring_output_id === outputId ? null : agentPolicy.monitoring_output_id,
      });
      // Validate that the output is not used by any agent policy before updating any policy
      await pMap(
        agentPolicies,
        async (agentPolicy) => {
          const soClient = appContextService.getInternalUserSOClientForSpaceId(
            agentPolicy.space_ids?.[0]
          );
          const existingAgentPolicy = await this.get(soClient, agentPolicy.id, true);

          if (!existingAgentPolicy) {
            throw new AgentPolicyNotFoundError('Agent policy not found');
          }

          await validateOutputForPolicy(
            soClient,
            getAgentPolicy(agentPolicy),
            existingAgentPolicy,
            getAllowedOutputTypesForAgentPolicy(existingAgentPolicy)
          );
        },
        {
          concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
        }
      );
      await pMap(
        agentPolicies,
        (agentPolicy) => {
          const soClient = appContextService.getInternalUserSOClientForSpaceId(
            agentPolicy.space_ids?.[0]
          );
          return this.update(soClient, esClient, agentPolicy.id, getAgentPolicy(agentPolicy), {
            skipValidation: true,
            force: options?.force,
          });
        },
        {
          concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
        }
      );
    }
  }

  /**
   * Remove a Fleet Server from all agent policies that are using it, to use the default one instead.
   */
  public async removeFleetServerHostFromAll(
    esClient: ElasticsearchClient,
    fleetServerHostId: string,
    options?: { force?: boolean }
  ) {
    const savedObjectType = await getAgentPolicySavedObjectType();
    const agentPolicies = (
      await appContextService
        .getInternalUserSOClientWithoutSpaceExtension()
        .find<AgentPolicySOAttributes>({
          type: savedObjectType,
          fields: ['revision', 'fleet_server_host_id'],
          searchFields: ['fleet_server_host_id'],
          search: escapeSearchQueryPhrase(fleetServerHostId),
          perPage: SO_SEARCH_LIMIT,
          namespaces: ['*'],
        })
    ).saved_objects.map(mapAgentPolicySavedObjectToAgentPolicy);

    if (agentPolicies.length > 0) {
      await pMap(
        agentPolicies,
        (agentPolicy) =>
          this.update(
            appContextService.getInternalUserSOClientForSpaceId(agentPolicy.space_ids?.[0]),
            esClient,
            agentPolicy.id,
            {
              fleet_server_host_id: null,
            },
            {
              force: options?.force,
            }
          ),
        {
          concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
        }
      );
    }
  }

  private async _bumpPolicies(
    internalSoClientWithoutSpaceExtension: SavedObjectsClientContract,
    savedObjectsResults: Array<SavedObject<AgentPolicySOAttributes>>,
    options?: { user?: AuthenticatedUser }
  ): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>> {
    const bumpedPolicies = savedObjectsResults.map(
      (policy): SavedObjectsBulkUpdateObject<AgentPolicySOAttributes> => {
        return {
          id: policy.id,
          type: policy.type,
          attributes: {
            ...policy.attributes,
            revision: policy.attributes.revision + 1,
            updated_at: new Date().toISOString(),
            updated_by: options?.user ? options.user.username : 'system',
          },
          version: policy.version,
          namespace: policy.namespaces?.[0],
        };
      }
    );

    const bumpedPoliciesBySpaceId = groupBy(
      bumpedPolicies,
      (policy) => policy.namespace || DEFAULT_SPACE_ID
    );

    const res = (
      await Promise.all(
        Object.entries(bumpedPoliciesBySpaceId).map(([spaceId, policies]) =>
          internalSoClientWithoutSpaceExtension.bulkUpdate<AgentPolicySOAttributes>(policies, {
            namespace: spaceId,
          })
        )
      )
    ).reduce(
      (acc, r) => {
        if (r?.saved_objects) {
          acc.saved_objects.push(...r.saved_objects);
        }
        return acc;
      },
      {
        saved_objects: [],
      }
    );

    await scheduleDeployAgentPoliciesTask(
      appContextService.getTaskManagerStart()!,
      savedObjectsResults.map((policy) => ({
        id: policy.id,
        spaceId: policy.namespaces?.[0],
      }))
    );

    return res;
  }

  public async bumpAllAgentPoliciesForOutput(
    esClient: ElasticsearchClient,
    outputId: string,
    options?: { user?: AuthenticatedUser }
  ): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>> {
    const { useSpaceAwareness } = appContextService.getExperimentalFeatures();
    const internalSoClientWithoutSpaceExtension =
      appContextService.getInternalUserSOClientWithoutSpaceExtension();

    const savedObjectType = await getAgentPolicySavedObjectType();
    // All agent policies directly using output
    const agentPoliciesUsingOutput =
      await internalSoClientWithoutSpaceExtension.find<AgentPolicySOAttributes>({
        type: savedObjectType,
        fields: ['revision', 'data_output_id', 'monitoring_output_id', 'namespaces'],
        searchFields: ['data_output_id', 'monitoring_output_id'],
        search: escapeSearchQueryPhrase(outputId),
        perPage: SO_SEARCH_LIMIT,
        namespaces: ['*'],
      });

    // All package policies directly using output
    const packagePoliciesUsingOutput =
      await internalSoClientWithoutSpaceExtension.find<PackagePolicySOAttributes>({
        type: await getPackagePolicySavedObjectType(),
        fields: ['output_id', 'namespaces', 'policy_ids'],
        searchFields: ['output_id'],
        search: escapeSearchQueryPhrase(outputId),
        perPage: SO_SEARCH_LIMIT,
        namespaces: ['*'],
      });

    const agentPolicyIdsDirectlyUsingOutput = agentPoliciesUsingOutput.saved_objects.map(
      (agentPolicySO) => agentPolicySO.id
    );
    const agentPolicyIdsOfPackagePoliciesUsingOutput =
      packagePoliciesUsingOutput.saved_objects.reduce((acc: Set<string>, packagePolicySO) => {
        const newIds = packagePolicySO.attributes.policy_ids.filter((policyId) => {
          return !agentPolicyIdsDirectlyUsingOutput.includes(policyId);
        });
        return new Set([...acc, ...newIds]);
      }, new Set<string>());

    // Agent policies of the identified package policies, excluding ones already retrieved directly
    const agentPoliciesOfPackagePoliciesUsingOutput =
      await internalSoClientWithoutSpaceExtension.bulkGet<AgentPolicySOAttributes>(
        [...agentPolicyIdsOfPackagePoliciesUsingOutput].map((id) => ({
          type: savedObjectType,
          id,
          fields: ['revision', 'data_output_id', 'monitoring_output_id', 'namespaces'],
          ...(useSpaceAwareness ? { namespaces: ['*'] } : {}),
        }))
      );

    return this._bumpPolicies(
      internalSoClientWithoutSpaceExtension,
      [
        ...agentPoliciesUsingOutput.saved_objects,
        ...agentPoliciesOfPackagePoliciesUsingOutput.saved_objects,
      ],
      options
    );
  }

  public async bumpAllAgentPolicies(
    esClient: ElasticsearchClient,
    options?: { user?: AuthenticatedUser }
  ): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>> {
    const internalSoClientWithoutSpaceExtension =
      appContextService.getInternalUserSOClientWithoutSpaceExtension();
    const savedObjectType = await getAgentPolicySavedObjectType();
    const currentPolicies =
      await internalSoClientWithoutSpaceExtension.find<AgentPolicySOAttributes>({
        type: savedObjectType,
        fields: ['name', 'revision', 'namespaces'],
        perPage: SO_SEARCH_LIMIT,
        namespaces: ['*'],
      });

    return this._bumpPolicies(
      internalSoClientWithoutSpaceExtension,
      currentPolicies.saved_objects,
      options
    );
  }

  public async delete(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    options?: { force?: boolean; user?: AuthenticatedUser }
  ): Promise<DeleteAgentPolicyResponse> {
    const logger = this.getLogger('delete');
    logger.debug(`Deleting agent policy ${id}`);
    const savedObjectType = await getAgentPolicySavedObjectType();

    const agentPolicy = await this.get(soClient, id, false);
    auditLoggingService.writeCustomSoAuditLog({
      action: 'delete',
      id,
      name: agentPolicy?.name,
      savedObjectType,
    });
    if (!agentPolicy) {
      throw new AgentPolicyNotFoundError('Agent policy not found');
    }

    if (agentPolicy.is_managed && !options?.force) {
      throw new HostedAgentPolicyRestrictionRelatedError(`Cannot delete hosted agent policy ${id}`);
    }

    // Prevent deleting policy when assigned agents are inactive
    const { total } = await getAgentsByKuery(esClient, soClient, {
      showInactive: true,
      perPage: 0,
      page: 1,
      kuery: `${AGENTS_PREFIX}.policy_id:"${id}"`,
    });

    if (total > 0 && !agentPolicy?.supports_agentless) {
      throw new FleetError(
        'Cannot delete an agent policy that is assigned to any active or inactive agents'
      );
    }

    if (agentPolicy?.supports_agentless) {
      logger.debug(`Starting  unenrolling agent from agentless policy ${id}`);
      // unenroll  offline agents for agentless policies first to avoid 404 Save Object error
      await this.triggerAgentPolicyUpdatedEvent(esClient, 'deleted', id, {
        spaceId: soClient.getCurrentNamespace(),
      });
      try {
        // Deleting agentless deployment
        await agentlessAgentService.deleteAgentlessAgent(id);
        logger.debug(
          `[Agentless API] Successfully deleted agentless deployment for single agent policy id ${id}`
        );
      } catch (error) {
        logger.error(
          `[Agentless API] Error deleting agentless deployment for single agent policy id ${id}`
        );
        logger.error(error);
      }
    }

    const packagePolicies = await packagePolicyService.findAllForAgentPolicy(soClient, id);

    if (packagePolicies.length) {
      const hasManagedPackagePolicies = packagePolicies.some(
        (packagePolicy) => packagePolicy.is_managed
      );
      if (hasManagedPackagePolicies && !options?.force) {
        throw new PackagePolicyRestrictionRelatedError(
          `Cannot delete agent policy ${id} that contains managed package policies`
        );
      }
      const { policiesWithSingleAP: packagePoliciesToDelete, policiesWithMultipleAP } =
        this.packagePoliciesWithSingleAndMultiplePolicies(packagePolicies);

      if (packagePoliciesToDelete.length > 0) {
        await packagePolicyService.delete(
          soClient,
          esClient,
          packagePoliciesToDelete.map((p) => p.id),
          {
            force: options?.force,
            skipUnassignFromAgentPolicies: true,
          }
        );
        logger.debug(
          `Deleted package policies with single agent policy with ids ${packagePoliciesToDelete
            .map((policy) => policy.id)
            .join(', ')}`
        );
      }

      if (policiesWithMultipleAP.length > 0) {
        await packagePolicyService.bulkUpdate(
          soClient,
          esClient,
          policiesWithMultipleAP.map((policy) => {
            const newPolicyIds = policy.policy_ids.filter((policyId) => policyId !== id);
            return {
              ...policy,
              policy_id: newPolicyIds[0],
              policy_ids: newPolicyIds,
            };
          })
        );
        logger.debug(
          `Updated package policies with multiple agent policies with ids ${policiesWithMultipleAP
            .map((policy) => policy.id)
            .join(', ')}`
        );
      }
    }

    if (agentPolicy.is_preconfigured && !options?.force) {
      await soClient
        .create(PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE, {
          id: String(id),
        })
        .catch(
          catchAndSetErrorStackTrace.withMessage(
            `Failed to create [${PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE}] with id [${id}]`
          )
        );
    }

    await soClient
      .delete(savedObjectType, id, {
        force: true, // need to delete through multiple space
      })
      .catch(catchAndSetErrorStackTrace.withMessage(`Failed to delete agent policy [${id}]`));

    if (!agentPolicy?.supports_agentless) {
      await this.triggerAgentPolicyUpdatedEvent(esClient, 'deleted', id, {
        spaceId: soClient.getCurrentNamespace(),
      });
    }

    // cleanup .fleet-policies docs on delete
    await this.deleteFleetServerPoliciesForPolicyId(esClient, id);

    logger.debug(`Deleted agent policy ${id}`);
    return {
      id,
      name: agentPolicy.name,
    };
  }

  public async deployPolicy(
    soClient: SavedObjectsClientContract,
    agentPolicyId: string,
    agentPolicy?: AgentPolicy | null
  ) {
    await this.deployPolicies(soClient, [agentPolicyId], agentPolicy ? [agentPolicy] : undefined);
  }

  public async deployPolicies(
    soClient: SavedObjectsClientContract,
    agentPolicyIds: string[],
    agentPolicies?: AgentPolicy[]
  ) {
    const logger = this.getLogger('deployPolicies');
    logger.debug(
      () =>
        `Deploying agent policies: [${agentPolicyIds.join(
          ', '
        )}] using soClient scoped to [${soClient.getCurrentNamespace()}]`
    );

    // Use internal ES client so we have permissions to write to .fleet* indices
    const esClient = appContextService.getInternalUserESClient();
    const defaultOutputId = await outputService.getDefaultDataOutputId(soClient);

    if (!defaultOutputId) {
      logger.debug(`Deployment canceled!! Default output ID is not defined.`);
      return;
    }

    for (const policyId of agentPolicyIds) {
      auditLoggingService.writeCustomAuditLog({
        message: `User deploying policy [id=${policyId}]`,
      });
    }

    const policies = await agentPolicyService.getByIds(soClient, agentPolicyIds);
    const policiesMap = keyBy(policies, 'id');

    logger.debug(`Retrieving full agent policies`);

    const fullPolicies = await pMap(
      agentPolicyIds,
      // There are some potential performance concerns around using `getFullAgentPolicy` in this context, e.g.
      // re-fetching outputs, settings, and upgrade download source URI data for each policy. This could potentially
      // be a bottleneck in environments with several thousand agent policies being deployed here.
      (agentPolicyId) =>
        agentPolicyService
          .getFullAgentPolicy(soClient, agentPolicyId, {
            agentPolicy: agentPolicies?.find((policy) => policy.id === agentPolicyId),
          })
          .then((response) => {
            if (!response) {
              logger.debug(
                `Unable to retrieve FULL agent policy for [${agentPolicyId}] - Deployment will not be done for this policy`
              );
            }

            return response;
          }),
      {
        concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_20,
      }
    );

    const fleetServerPolicies = fullPolicies.reduce((acc, fullPolicy) => {
      if (!fullPolicy || !fullPolicy.revision) {
        return acc;
      }

      const policy = policiesMap[fullPolicy.id];
      if (!policy) {
        return acc;
      }

      const fleetServerPolicy: FleetServerPolicy = {
        '@timestamp': new Date().toISOString(),
        revision_idx: fullPolicy.revision,
        coordinator_idx: 0,
        namespaces: fullPolicy.namespaces,
        data: fullPolicy as unknown as FleetServerPolicy['data'],
        policy_id: fullPolicy.id,
        default_fleet_server: policy.is_default_fleet_server === true,
      };

      acc.push(fleetServerPolicy);
      return acc;
    }, [] as FleetServerPolicy[]);

    logger.debug(
      () =>
        `Deploying policies: ${fleetServerPolicies
          .map((pol) => `${pol.policy_id}:${pol.revision_idx}`)
          .join(', ')}`
    );

    const fleetServerPoliciesBulkBody = fleetServerPolicies.flatMap((fleetServerPolicy) => [
      {
        index: {
          _id: uuidv5(
            `${fleetServerPolicy.policy_id}:${fleetServerPolicy.revision_idx}`,
            uuidv5.DNS
          ),
        },
      },
      fleetServerPolicy,
    ]);

    const bulkResponse = await esClient
      .bulk({
        index: AGENT_POLICY_INDEX,
        operations: fleetServerPoliciesBulkBody,
        refresh: 'wait_for',
      })
      .catch(catchAndSetErrorStackTrace.withMessage('ES bulk operation failed'));

    logger.debug(`Bulk update against index [${AGENT_POLICY_INDEX}] with deployment updates done`);

    if (bulkResponse.errors) {
      const erroredDocuments = bulkResponse.items.reduce((acc, item) => {
        const value: BulkResponseItem | undefined = item.index;
        if (!value || !value.error) {
          return acc;
        }

        acc.push(value);
        return acc;
      }, [] as BulkResponseItem[]);

      logger.warn(
        `Failed to index documents during policy deployment: ${JSON.stringify(erroredDocuments)}`
      );
    }

    const filteredFleetServerPolicies = fleetServerPolicies.filter((fleetServerPolicy) => {
      const policy = policiesMap[fleetServerPolicy.policy_id];
      return (
        !policy.schema_version || lt(policy.schema_version, FLEET_AGENT_POLICIES_SCHEMA_VERSION)
      );
    });

    await pMap(
      filteredFleetServerPolicies,
      (fleetServerPolicy) => {
        logger.debug(
          `Updating agent policy id [${fleetServerPolicy.policy_id}] following successful deployment of fleet server policy`
        );

        // There are some potential performance concerns around using `agentPolicyService.update` in this context.
        // This could potentially be a bottleneck in environments with several thousand agent policies being deployed here.
        return agentPolicyService.update(
          soClient,
          esClient,
          fleetServerPolicy.policy_id,
          {
            schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          },
          { force: true }
        );
      },
      {
        concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
      }
    );
  }

  public async deleteFleetServerPoliciesForPolicyId(
    esClient: ElasticsearchClient,
    agentPolicyId: string
  ) {
    auditLoggingService.writeCustomAuditLog({
      message: `User deleting policy [id=${agentPolicyId}]`,
    });

    let hasMore = true;
    while (hasMore) {
      const res = await esClient.deleteByQuery({
        index: AGENT_POLICY_INDEX,
        ignore_unavailable: true,
        scroll_size: SO_SEARCH_LIMIT,
        refresh: true,
        query: {
          term: {
            policy_id: agentPolicyId,
          },
        },
      });
      hasMore = (res.deleted ?? 0) === SO_SEARCH_LIMIT;
    }
  }

  public async getLatestFleetPolicy(esClient: ElasticsearchClient, agentPolicyId: string) {
    const res = await esClient.search<FleetServerPolicy>({
      index: AGENT_POLICY_INDEX,
      ignore_unavailable: true,
      rest_total_hits_as_int: true,
      query: {
        term: {
          policy_id: agentPolicyId,
        },
      },
      size: 1,
      sort: [{ revision_idx: { order: 'desc' } }],
    });

    if ((res.hits.total as number) === 0) {
      return null;
    }

    return res.hits.hits[0]._source;
  }

  public async getFullAgentConfigMap(
    soClient: SavedObjectsClientContract,
    id: string,
    agentVersion: string,
    options?: { standalone: boolean }
  ): Promise<string | null> {
    const fullAgentPolicy = await getFullAgentPolicy(soClient, id, options);
    if (fullAgentPolicy) {
      const fullAgentConfigMap: FullAgentConfigMap = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: 'agent-node-datastreams',
          namespace: 'kube-system',
          labels: {
            'k8s-app': 'elastic-agent',
          },
        },
        data: {
          'agent.yml': fullAgentPolicy,
        },
      };

      const configMapYaml = fullAgentConfigMapToYaml(fullAgentConfigMap, dump);
      const updateManifestVersion = elasticAgentStandaloneManifest.replace('VERSION', agentVersion);
      const fixedAgentYML = configMapYaml.replace('agent.yml:', 'agent.yml: |-');
      return [fixedAgentYML, updateManifestVersion].join('\n');
    } else {
      return '';
    }
  }

  public async getFullAgentManifest(
    fleetServer: string,
    enrolToken: string,
    agentVersion: string
  ): Promise<string | null> {
    const updateManifestVersion = elasticAgentManagedManifest.replace('VERSION', agentVersion);
    let updateManifest = updateManifestVersion;
    if (fleetServer !== '') {
      updateManifest = updateManifest.replace('https://fleet-server:8220', fleetServer);
    }
    if (enrolToken !== '') {
      updateManifest = updateManifest.replace('token-id', enrolToken);
    }

    return updateManifest;
  }

  public async getFullAgentPolicy(
    soClient: SavedObjectsClientContract,
    id: string,
    options?: { standalone?: boolean; agentPolicy?: AgentPolicy }
  ): Promise<FullAgentPolicy | null> {
    return getFullAgentPolicy(soClient, id, options);
  }

  /**
   * Remove a download source from all agent policies that are using it, and replace the output by the default ones.
   * @param soClient
   * @param esClient
   * @param downloadSourceId
   */
  public async removeDefaultSourceFromAll(esClient: ElasticsearchClient, downloadSourceId: string) {
    const savedObjectType = await getAgentPolicySavedObjectType();
    const agentPolicies = (
      await appContextService
        .getInternalUserSOClientWithoutSpaceExtension()
        .find<AgentPolicySOAttributes>({
          type: savedObjectType,
          fields: ['revision', 'download_source_id'],
          searchFields: ['download_source_id'],
          search: escapeSearchQueryPhrase(downloadSourceId),
          perPage: SO_SEARCH_LIMIT,
          namespaces: ['*'],
        })
    ).saved_objects.map(mapAgentPolicySavedObjectToAgentPolicy);

    if (agentPolicies.length > 0) {
      await pMap(
        agentPolicies,
        (agentPolicy) =>
          this.update(
            appContextService.getInternalUserSOClientForSpaceId(agentPolicy.space_ids?.[0]),
            esClient,
            agentPolicy.id,
            {
              download_source_id:
                agentPolicy.download_source_id === downloadSourceId
                  ? null
                  : agentPolicy.download_source_id,
            }
          ),
        {
          concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
        }
      );
    }
  }

  public async bumpAllAgentPoliciesForDownloadSource(
    esClient: ElasticsearchClient,
    downloadSourceId: string,
    options?: { user?: AuthenticatedUser }
  ): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>> {
    const internalSoClientWithoutSpaceExtension =
      appContextService.getInternalUserSOClientWithoutSpaceExtension();
    const savedObjectType = await getAgentPolicySavedObjectType();
    const currentPolicies =
      await internalSoClientWithoutSpaceExtension.find<AgentPolicySOAttributes>({
        type: savedObjectType,
        fields: ['revision', 'download_source_id', 'namespaces'],
        searchFields: ['download_source_id'],
        search: escapeSearchQueryPhrase(downloadSourceId),
        perPage: SO_SEARCH_LIMIT,
        namespaces: ['*'],
      });

    return this._bumpPolicies(
      internalSoClientWithoutSpaceExtension,
      currentPolicies.saved_objects,
      options
    );
  }

  public async bumpAllAgentPoliciesForFleetServerHosts(
    esClient: ElasticsearchClient,
    fleetServerHostId: string,
    options?: { user?: AuthenticatedUser }
  ): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>> {
    const internalSoClientWithoutSpaceExtension =
      appContextService.getInternalUserSOClientWithoutSpaceExtension();
    const savedObjectType = await getAgentPolicySavedObjectType();
    const currentPolicies =
      await internalSoClientWithoutSpaceExtension.find<AgentPolicySOAttributes>({
        type: savedObjectType,
        fields: ['revision', 'fleet_server_host_id', 'namespaces'],
        searchFields: ['fleet_server_host_id'],
        search: escapeSearchQueryPhrase(fleetServerHostId),
        perPage: SO_SEARCH_LIMIT,
      });

    return this._bumpPolicies(
      internalSoClientWithoutSpaceExtension,
      currentPolicies.saved_objects,
      options
    );
  }

  public async bumpAgentPoliciesByIds(
    agentPolicyIds: string[],
    options?: { user?: AuthenticatedUser },
    spaceId?: string
  ): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>> {
    const internalSoClientWithoutSpaceExtension =
      appContextService.getInternalUserSOClientWithoutSpaceExtension();
    const savedObjectType = await getAgentPolicySavedObjectType();

    const objects = agentPolicyIds.map((id: string) => ({ id, type: savedObjectType }));
    const bulkGetResponse = await internalSoClientWithoutSpaceExtension
      .bulkGet<AgentPolicySOAttributes>(objects, { namespace: spaceId })
      .catch(
        catchAndSetErrorStackTrace.withMessage(
          `Failed to bulk get agent policies [${agentPolicyIds.join(', ')}]`
        )
      );

    return this._bumpPolicies(
      internalSoClientWithoutSpaceExtension,
      bulkGetResponse.saved_objects,
      options
    );
  }

  public async getInactivityTimeouts(): Promise<
    Array<{ policyIds: string[]; inactivityTimeout: number }>
  > {
    const savedObjectType = await getAgentPolicySavedObjectType();
    const internalSoClientWithoutSpaceExtension =
      appContextService.getInternalUserSOClientWithoutSpaceExtension();
    const findRes = await internalSoClientWithoutSpaceExtension.find<AgentPolicySOAttributes>({
      type: savedObjectType,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      filter: `${savedObjectType}.attributes.inactivity_timeout > 0`,
      fields: [`inactivity_timeout`],
      namespaces: ['*'],
    });

    const groupedResults = groupBy(findRes.saved_objects, (so) => so.attributes.inactivity_timeout);

    return Object.entries(groupedResults).map(([inactivityTimeout, policies]) => ({
      inactivityTimeout: parseInt(inactivityTimeout, 10),
      policyIds: policies.map((policy) => policy.id),
    }));
  }

  public async turnOffAgentTamperProtections(soClient: SavedObjectsClientContract): Promise<{
    updatedPolicies: Array<Partial<AgentPolicy>> | null;
    failedPolicies: Array<{ id: string; error: Error | SavedObjectError }>;
  }> {
    const savedObjectType = await getAgentPolicySavedObjectType();
    const agentPolicyFetcher = await this.fetchAllAgentPolicies(soClient, {
      kuery: `${savedObjectType}.is_protected: true`,
    });

    const updatedAgentPolicies: Array<SavedObjectsUpdateResponse<AgentPolicySOAttributes>> = [];

    for await (const agentPolicyPageResults of agentPolicyFetcher) {
      const { saved_objects: bulkUpdateSavedObjects } = await soClient
        .bulkUpdate<AgentPolicySOAttributes>(
          agentPolicyPageResults.map((agentPolicy) => {
            const { id, revision } = agentPolicy;
            return {
              id,
              type: savedObjectType,
              attributes: {
                is_protected: false,
                revision: revision + 1,
                updated_at: new Date().toISOString(),
                updated_by: 'system',
              },
            };
          })
        )
        .catch(catchAndSetErrorStackTrace.withMessage('bulkUpdate of agent policies failed'));
      updatedAgentPolicies.push(...bulkUpdateSavedObjects);
    }
    if (!updatedAgentPolicies.length) {
      return {
        updatedPolicies: null,
        failedPolicies: [],
      };
    }

    const failedPolicies: Array<{
      id: string;
      error: Error | SavedObjectError;
    }> = [];

    updatedAgentPolicies.forEach((policy) => {
      if (policy.error) {
        failedPolicies.push({
          id: policy.id,
          error: policy.error,
        });
      }
    });

    const updatedPoliciesSuccess = updatedAgentPolicies.filter((policy) => !policy.error);

    await scheduleDeployAgentPoliciesTask(
      appContextService.getTaskManagerStart()!,
      updatedPoliciesSuccess.map((policy) => ({
        id: policy.id,
        spaceId: policy.namespaces?.[0],
      }))
    );

    return { updatedPolicies: updatedPoliciesSuccess, failedPolicies };
  }

  public async getAllManagedAgentPolicies(soClient: SavedObjectsClientContract) {
    const savedObjectType = await getAgentPolicySavedObjectType();
    const { saved_objects: agentPolicies } = await soClient
      .find<AgentPolicySOAttributes>({
        type: savedObjectType,
        page: 1,
        perPage: SO_SEARCH_LIMIT,
        filter: normalizeKuery(savedObjectType, 'ingest-agent-policies.is_managed: true'),
      })
      .catch(catchAndSetErrorStackTrace.withMessage('Failed to get all managed agent policies'));

    return agentPolicies;
  }

  public async fetchAllAgentPolicyIds(
    soClient: SavedObjectsClientContract,
    { perPage = 1000, kuery = undefined, spaceId = undefined }: FetchAllAgentPolicyIdsOptions = {}
  ): Promise<AsyncIterable<string[]>> {
    const savedObjectType = await getAgentPolicySavedObjectType();
    return createSoFindIterable<{ name: string }>({
      soClient,
      findRequest: {
        type: savedObjectType,
        perPage,
        sortField: 'created_at',
        sortOrder: 'asc',
        fields: ['id', 'name'],
        filter: kuery ? normalizeKuery(savedObjectType, kuery) : undefined,
        namespaces: spaceId ? [spaceId] : undefined,
      },
      resultsMapper: (data) => {
        return data.saved_objects.map((agentPolicySO) => {
          auditLoggingService.writeCustomSoAuditLog({
            action: 'find',
            id: agentPolicySO.id,
            name: agentPolicySO.attributes.name,
            savedObjectType,
          });
          return agentPolicySO.id;
        });
      },
    });
  }

  public async fetchAllAgentPolicies(
    soClient: SavedObjectsClientContract,
    {
      perPage = 1000,
      kuery,
      sortOrder = 'asc',
      sortField = 'created_at',
      fields = [],
      spaceId = undefined,
    }: FetchAllAgentPoliciesOptions = {}
  ): Promise<AsyncIterable<AgentPolicy[]>> {
    const savedObjectType = await getAgentPolicySavedObjectType();
    return createSoFindIterable<AgentPolicySOAttributes>({
      soClient,
      findRequest: {
        type: savedObjectType,
        sortField,
        sortOrder,
        perPage,
        fields,
        filter: kuery ? normalizeKuery(savedObjectType, kuery) : undefined,
        namespaces: spaceId ? [spaceId] : undefined,
      },
      resultsMapper(data) {
        return data.saved_objects.map((agentPolicySO) => {
          auditLoggingService.writeCustomSoAuditLog({
            action: 'find',
            id: agentPolicySO.id,
            savedObjectType,
          });
          return mapAgentPolicySavedObjectToAgentPolicy(agentPolicySO);
        });
      },
    });
  }

  // Get all the outputs per agent policy
  public async getAllOutputsForPolicy(
    soClient: SavedObjectsClientContract,
    agentPolicy: AgentPolicy
  ) {
    const logger = this.getLogger('getAllOutputsForPolicy');

    const [defaultDataOutputId, defaultMonitoringOutputId] = await Promise.all([
      outputService.getDefaultDataOutputId(soClient),
      outputService.getDefaultMonitoringOutputId(soClient),
    ]);

    if (!defaultDataOutputId) {
      throw new OutputNotFoundError('Default output is not setup');
    }

    const dataOutputId = agentPolicy.data_output_id || defaultDataOutputId;
    const monitoringOutputId =
      agentPolicy.monitoring_output_id || defaultMonitoringOutputId || dataOutputId;

    const outputIds = uniq([dataOutputId, monitoringOutputId]);

    const fetchedOutputs = await outputService.bulkGet(outputIds, {
      ignoreNotFound: true,
    });

    const dataOutput = fetchedOutputs.find((output) => output.id === dataOutputId);
    const monitoringOutput = fetchedOutputs.find((output) => output.id === monitoringOutputId);

    let integrationsDataOutputs: IntegrationsOutput[] = [];
    if (agentPolicy?.package_policies) {
      const integrationsWithOutputs = agentPolicy.package_policies.filter(
        (pkgPolicy) => !!pkgPolicy?.output_id
      );
      integrationsDataOutputs = await pMap(
        integrationsWithOutputs,
        async (pkgPolicy) => {
          if (pkgPolicy?.output_id) {
            try {
              const output = await outputService.get(soClient, pkgPolicy.output_id);
              return { integrationPolicyName: pkgPolicy?.name, id: output.id, name: output.name };
            } catch (error) {
              logger.error(
                `error while retrieving output with id "${pkgPolicy.output_id}": ${error}`
              );
            }
          }
          return { integrationPolicyName: pkgPolicy?.name, id: pkgPolicy?.output_id ?? '' };
        },
        {
          concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_20,
        }
      );
    }
    const outputs: OutputsForAgentPolicy = {
      monitoring: {
        output: {
          name: monitoringOutput?.name ?? '',
          id: monitoringOutput?.id ?? '',
        },
      },
      data: {
        output: {
          name: dataOutput?.name ?? '',
          id: dataOutput?.id ?? '',
        },
        integrations: integrationsDataOutputs ?? [],
      },
    };
    return outputs;
  }

  public async listAllOutputsForPolicies(
    soClient: SavedObjectsClientContract,
    agentPolicies: AgentPolicy[]
  ) {
    const allOutputs: OutputsForAgentPolicy[] = await pMap(
      agentPolicies,
      async (agentPolicy) => {
        const output = await this.getAllOutputsForPolicy(soClient, agentPolicy);
        return { agentPolicyId: agentPolicy.id, ...output };
      },
      {
        concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
      }
    );
    return allOutputs;
  }

  private checkTamperProtectionLicense(agentPolicy: { is_protected?: boolean }): void {
    if (agentPolicy?.is_protected && !licenseService.isPlatinum()) {
      throw new FleetUnauthorizedError('Tamper protection requires Platinum license');
    }
  }
  private async checkForValidUninstallToken(
    agentPolicy: { is_protected?: boolean },
    policyId: string
  ): Promise<void> {
    if (agentPolicy?.is_protected) {
      const uninstallTokenService = appContextService.getUninstallTokenService();

      const uninstallTokenError = await uninstallTokenService?.checkTokenValidityForPolicy(
        policyId
      );

      if (uninstallTokenError) {
        throw new FleetError(
          `Cannot enable Agent Tamper Protection: ${uninstallTokenError.error.message}`
        );
      }
    }
  }
  private checkAgentless(agentPolicy: Partial<NewAgentPolicy>) {
    if (!isAgentlessEnabled() && agentPolicy?.supports_agentless) {
      throw new AgentPolicyInvalidError(
        'supports_agentless is only allowed in serverless and cloud environments that support the agentless feature'
      );
    }
  }

  private packagePoliciesWithSingleAndMultiplePolicies(packagePolicies: PackagePolicy[]): {
    policiesWithSingleAP: PackagePolicy[];
    policiesWithMultipleAP: PackagePolicy[];
  } {
    // Find package policies that don't have multiple agent policies and mark them for deletion
    const policiesWithSingleAP = packagePolicies.filter(
      (policy) => !policy?.policy_ids || policy?.policy_ids.length <= 1
    );
    const policiesWithMultipleAP = packagePolicies.filter(
      (policy) => policy?.policy_ids && policy?.policy_ids.length > 1
    );
    return { policiesWithSingleAP, policiesWithMultipleAP };
  }
}

export const agentPolicyService = new AgentPolicyService();

export async function addPackageToAgentPolicy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicy: AgentPolicy,
  packageInfo: PackageInfo,
  packagePolicyName?: string,
  packagePolicyId?: string | number,
  packagePolicyDescription?: string,
  transformPackagePolicy?: (p: NewPackagePolicy) => NewPackagePolicy,
  bumpAgentPolicyRevison = false
) {
  const basePackagePolicy = packageToPackagePolicy(
    packageInfo,
    agentPolicy.id,
    agentPolicy.namespace ?? 'default',
    packagePolicyName,
    packagePolicyDescription
  );

  const newPackagePolicy = transformPackagePolicy
    ? transformPackagePolicy(basePackagePolicy)
    : basePackagePolicy;

  // If an ID is provided via preconfiguration, use that value. Otherwise fall back to
  // a UUID v5 value seeded from the agent policy's ID and the provided package policy name.
  const id = packagePolicyId
    ? String(packagePolicyId)
    : uuidv5(`${agentPolicy.id}-${packagePolicyName}`, UUID_V5_NAMESPACE);

  await packagePolicyService.create(soClient, esClient, newPackagePolicy, {
    id,
    bumpRevision: bumpAgentPolicyRevison,
    skipEnsureInstalled: true,
    skipUniqueNameVerification: true,
    overwrite: true,
    force: true, // To add package to managed policy we need the force flag
    packageInfo,
  });
}
