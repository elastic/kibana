/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import { set } from '@kbn/safer-lodash-set';
import { unset, has, difference, filter, map, mapKeys, uniq, some, isEmpty } from 'lodash';
import { produce } from 'immer';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import type {
  UpdatePacksRequestParamsSchema,
  UpdatePacksRequestBodySchema,
} from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { packSavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';
import {
  convertSOQueriesToPack,
  convertPackQueriesToSO,
  convertSOQueriesToPackConfig,
  getInitialPolicies,
  findMatchingShards,
} from './utils';

import { convertShardsToArray } from '../utils';
import type { PackSavedObject } from '../../common/types';
import type { PackResponseData } from './types';
import { updatePacksRequestBodySchema, updatePacksRequestParamsSchema } from '../../../common/api';
import { getUserInfo } from '../../lib/get_user_info';
import { escapeFilterValue } from '../utils/generate_copy_name';
import { createScheduledActionDocument } from '../../handlers/action/create_scheduled_action_document';

export const updatePackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .put({
      access: 'public',
      path: '/api/osquery/packs/{id}',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-writePacks`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidation<
              typeof updatePacksRequestParamsSchema,
              UpdatePacksRequestParamsSchema
            >(updatePacksRequestParamsSchema),
            body: buildRouteValidation<
              typeof updatePacksRequestBodySchema,
              UpdatePacksRequestBodySchema
            >(updatePacksRequestBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );

        const agentPolicyService = osqueryContext.service.getAgentPolicyService();
        const packagePolicyService = osqueryContext.service.getPackagePolicyService();

        const currentUser = await getUserInfo({
          request,
          security: osqueryContext.security,
          logger: osqueryContext.logFactory.get('pack'),
        });
        const username = currentUser?.username ?? undefined;

        const { name, description, queries: rawQueries, enabled, policy_ids, shards = {} } = request.body;

        const currentPackSO = await spaceScopedClient.get<{ name: string; enabled: boolean; queries?: Array<{ id: string; action_id?: string; start_date?: string }> }>(
          packSavedObjectType,
          request.params.id
        );

        // Build a map of existing action_ids from the current pack SO queries
        const existingActionIdMap: Record<string, { action_id: string; start_date?: string }> = {};
        if (currentPackSO.attributes.queries) {
          for (const q of currentPackSO.attributes.queries) {
            if (q.action_id) {
              existingActionIdMap[q.id] = { action_id: q.action_id, start_date: q.start_date };
            }
          }
        }

        // Backfill action_id and start_date for queries
        const now = moment().toISOString();
        const queries = rawQueries
          ? Object.fromEntries(
              Object.entries(rawQueries).map(([key, value]) => {
                const existing = existingActionIdMap[key];

                return [
                  key,
                  {
                    ...value,
                    action_id: existing?.action_id ?? uuidv4(),
                    start_date: existing?.start_date ?? now,
                  },
                ];
              })
            )
          : rawQueries;

        if (name) {
          const conflictingEntries = await spaceScopedClient.find<PackSavedObject>({
            type: packSavedObjectType,
            filter: `${packSavedObjectType}.attributes.name: "${escapeFilterValue(name)}"`,
          });

          if (
            some(
              filter(conflictingEntries.saved_objects, (packSO) => packSO.id !== currentPackSO.id),
              ['attributes.name', name]
            )
          ) {
            return response.conflict({ body: `Pack with name "${name}" already exists.` });
          }
        }

        const { items: packagePolicies } = (await packagePolicyService?.list(spaceScopedClient, {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
          perPage: 1000,
          page: 1,
        })) ?? { items: [] };
        const currentPackagePolicies = filter(packagePolicies, (packagePolicy) =>
          has(
            packagePolicy,
            `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`
          )
        );

        const { policiesList, invalidPolicies } = getInitialPolicies(
          packagePolicies,
          policy_ids,
          shards
        );

        if (invalidPolicies?.length) {
          return response.badRequest({
            body: `The following policy ids are invalid: ${invalidPolicies.join(', ')}`,
          });
        }

        const agentPolicies = await agentPolicyService?.getByIds(spaceScopedClient, policiesList);

        const policyShards = findMatchingShards(agentPolicies, shards);

        const agentPoliciesIdMap = mapKeys(agentPolicies, 'id');

        const nonAgentPolicyReferences = filter(
          currentPackSO.references,
          (reference) => reference.type !== LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE
        );
        const getUpdatedReferences = () => {
          if (!policy_ids && isEmpty(shards)) {
            return currentPackSO.references;
          }

          return [
            ...nonAgentPolicyReferences,
            ...policiesList.map((id) => ({
              id,
              name: agentPoliciesIdMap[id]?.name,
              type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
            })),
          ];
        };

        const references = getUpdatedReferences();

        await spaceScopedClient.update<PackSavedObject>(
          packSavedObjectType,
          request.params.id,
          {
            enabled,
            name,
            description: description || '',
            queries: queries && convertPackQueriesToSO(queries),
            updated_at: moment().toISOString(),
            updated_by: username,
            shards: convertShardsToArray(shards),
          },
          {
            refresh: 'wait_for',
            references,
          }
        );

        const currentAgentPolicyIds = map(
          filter(currentPackSO.references, ['type', LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE]),
          'id'
        );
        const updatedPackSO = await spaceScopedClient.get<PackSavedObject>(
          packSavedObjectType,
          request.params.id
        );

        // @ts-expect-error update types
        updatedPackSO.attributes.queries = convertSOQueriesToPack(updatedPackSO.attributes.queries);

        if (enabled == null && !currentPackSO.attributes.enabled) {
          return response.ok({ body: { data: updatedPackSO } });
        }

        if (enabled != null && enabled !== currentPackSO.attributes.enabled) {
          if (enabled) {
            const policyIds = policy_ids || !isEmpty(shards) ? policiesList : currentAgentPolicyIds;

            await Promise.all(
              policyIds.map((agentPolicyId) => {
                const packagePolicy = packagePolicies.find((policy) =>
                  policy.policy_ids.includes(agentPolicyId)
                );
                if (packagePolicy) {
                  return packagePolicyService?.update(
                    spaceScopedClient,
                    esClient,
                    packagePolicy.id,
                    produce<PackagePolicy>(packagePolicy, (draft) => {
                      unset(draft, 'id');
                      if (!has(draft, 'inputs[0].streams')) {
                        set(draft, 'inputs[0].streams', []);
                      }

                      set(
                        draft,
                        `inputs[0].config.osquery.value.packs.${updatedPackSO.attributes.name}`,
                        {
                          schedule_id: updatedPackSO.id,
                          start_date: updatedPackSO.attributes.created_at,
                          queries: convertSOQueriesToPackConfig(updatedPackSO.attributes.queries),
                        }
                      );

                      return draft;
                    })
                  );
                }
              })
            );
          } else {
            await Promise.all(
              currentAgentPolicyIds.map((agentPolicyId) => {
                const packagePolicy = currentPackagePolicies.find((policy) =>
                  policy.policy_ids.includes(agentPolicyId)
                );
                if (!packagePolicy) return;

                return packagePolicyService?.update(
                  spaceScopedClient,
                  esClient,
                  packagePolicy.id,
                  produce<PackagePolicy>(packagePolicy, (draft) => {
                    unset(draft, 'id');
                    unset(
                      draft,
                      `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`
                    );

                    return draft;
                  })
                );
              })
            );
          }
        } else {
          // TODO double check if policiesList shouldnt be changed into policyIds
          const agentPolicyIdsToRemove = uniq(difference(currentAgentPolicyIds, policiesList));
          const agentPolicyIdsToUpdate = uniq(
            difference(currentAgentPolicyIds, agentPolicyIdsToRemove)
          );
          const agentPolicyIdsToAdd = uniq(difference(policiesList, currentAgentPolicyIds));

          await Promise.all(
            agentPolicyIdsToRemove.map((agentPolicyId) => {
              const packagePolicy = currentPackagePolicies.find((policy) =>
                policy.policy_ids.includes(agentPolicyId)
              );
              if (packagePolicy) {
                return packagePolicyService?.update(
                  spaceScopedClient,
                  esClient,
                  packagePolicy.id,
                  produce<PackagePolicy>(packagePolicy, (draft) => {
                    unset(draft, 'id');
                    unset(
                      draft,
                      `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`
                    );

                    return draft;
                  })
                );
              }
            })
          );

          await Promise.all(
            agentPolicyIdsToUpdate.map((agentPolicyId) => {
              const packagePolicy = packagePolicies.find((policy) =>
                policy.policy_ids.includes(agentPolicyId)
              );
              if (packagePolicy) {
                return packagePolicyService?.update(
                  spaceScopedClient,
                  esClient,
                  packagePolicy.id,
                  produce<PackagePolicy>(packagePolicy, (draft) => {
                    unset(draft, 'id');
                    if (updatedPackSO.attributes.name !== currentPackSO.attributes.name) {
                      unset(
                        draft,
                        `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`
                      );
                    }

                    set(
                      draft,
                      `inputs[0].config.osquery.value.packs.${updatedPackSO.attributes.name}`,
                      {
                        shard: policyShards[agentPolicyId] ?? 100,
                        schedule_id: updatedPackSO.id,
                        start_date: updatedPackSO.attributes.created_at,
                        queries: convertSOQueriesToPackConfig(updatedPackSO.attributes.queries),
                      }
                    );

                    return draft;
                  })
                );
              }
            })
          );

          await Promise.all(
            agentPolicyIdsToAdd.map((agentPolicyId) => {
              const packagePolicy = packagePolicies.find((policy) =>
                policy.policy_ids.includes(agentPolicyId)
              );

              if (packagePolicy) {
                return packagePolicyService?.update(
                  spaceScopedClient,
                  esClient,
                  packagePolicy.id,
                  produce<PackagePolicy>(packagePolicy, (draft) => {
                    unset(draft, 'id');
                    if (!(draft.inputs.length && draft.inputs[0].streams.length)) {
                      set(draft, 'inputs[0].streams', []);
                    }

                    set(
                      draft,
                      `inputs[0].config.osquery.value.packs.${updatedPackSO.attributes.name}`,
                      {
                        shard: policyShards[agentPolicyId] ?? 100,
                        schedule_id: updatedPackSO.id,
                        start_date: updatedPackSO.attributes.created_at,
                        queries: convertSOQueriesToPackConfig(updatedPackSO.attributes.queries),
                      }
                    );

                    return draft;
                  })
                );
              }
            })
          );
        }

        // Create scheduled action document once for an enabled pack with policy_ids (idempotent)
        const isPackEnabled = enabled ?? currentPackSO.attributes.enabled;
        const effectivePolicies = policiesList.length > 0 ? policiesList : currentAgentPolicyIds;
        const hasPolicies = effectivePolicies.length > 0;
        // Fall back to the saved object's queries when the request body doesn't include queries
        // (e.g. when re-enabling a pack without modifying its queries)
        const effectiveQueries = queries ?? updatedPackSO.attributes.queries;
        const hasQueries = effectiveQueries && Object.keys(effectiveQueries).length > 0;

        if (isPackEnabled && hasPolicies && hasQueries) {
          const spaceId = osqueryContext?.service?.getActiveSpace
            ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
            : DEFAULT_SPACE_ID;

          const scheduledQueries = convertPackQueriesToSO(effectiveQueries).map((q: { id: string; action_id?: string; query: string; interval?: number; version?: string; platform?: string; timeout?: number }) => ({
            action_id: q.action_id ?? '',
            id: q.id,
            query: q.query,
            interval: q.interval,
            version: q.version,
            platform: q.platform,
            timeout: q.timeout,
          }));

          const internalEsClient = coreContext.elasticsearch.client.asInternalUser;
          await createScheduledActionDocument({
            esClient: internalEsClient,
            actionId: updatedPackSO.id,
            packId: updatedPackSO.id,
            packName: updatedPackSO.attributes.name,
            queries: scheduledQueries,
            spaceId,
            logger: osqueryContext.logFactory.get('scheduled-action'),
          });
        }

        const { attributes } = updatedPackSO;

        const data: PackResponseData = {
          name: attributes.name,
          description: attributes.description,
          schedule_id: updatedPackSO.id,
          start_date: attributes.created_at,
          queries: attributes.queries,
          version: attributes.version,
          enabled: attributes.enabled,
          created_at: attributes.created_at,
          created_by: attributes.created_by,
          updated_at: attributes.updated_at,
          updated_by: attributes.updated_by,
          policy_ids: attributes.policy_ids,
          shards: attributes.shards,
          saved_object_id: updatedPackSO.id,
        };

        return response.ok({
          body: { data },
        });
      }
    );
};
