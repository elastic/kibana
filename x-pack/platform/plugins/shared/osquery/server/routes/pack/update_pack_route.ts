/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { v4 as uuidv4 } from 'uuid';
import { set } from '@kbn/safer-lodash-set';
import {
  unset,
  has,
  difference,
  filter,
  map,
  mapKeys,
  mapValues,
  uniq,
  some,
  isEmpty,
  keyBy,
} from 'lodash';
import { produce } from 'immer';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import { type IRouter, SavedObjectsErrorHelpers } from '@kbn/core/server';

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
import type { StartPlugins } from '../../types';
import { PLUGIN_ID } from '../../../common';
import {
  convertSOQueriesToPack,
  convertPackQueriesToSO,
  convertSOQueriesToPackConfig,
  extractAndValidatePackScheduleFromBody,
  getInitialPolicies,
  findMatchingShards,
  policyHasPack,
  removePackFromPolicy,
  makePackKey,
} from './utils';

import { convertShardsToArray } from '../utils';
import type { PackSavedObject } from '../../common/types';
import type { PackResponseData } from './types';
import type { PackQueryInput } from './utils';
import { updatePacksRequestBodySchema, updatePacksRequestParamsSchema } from '../../../common/api';
import { getUserInfo } from '../../lib/get_user_info';
import { escapeFilterValue } from '../utils/generate_copy_name';
import { updatePackResponseSchema } from './response_schemas';

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
          response: {
            200: {
              body: () => updatePackResponseSchema,
            },
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

        const spaceId = osqueryContext?.service?.getActiveSpace
          ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
          : DEFAULT_SPACE_ID;

        const agentPolicyService = osqueryContext.service.getAgentPolicyService();
        const packagePolicyService = osqueryContext.service.getPackagePolicyService();

        const [, startPlugins] = await osqueryContext.getStartServices();
        const currentUser = await getUserInfo({
          request,
          security: (startPlugins as StartPlugins).security,
          logger: osqueryContext.logFactory.get('pack'),
        });
        const username = currentUser?.username ?? undefined;
        const profileUid = currentUser?.profile_uid ?? undefined;

        const { name, description, enabled, policy_ids, shards = {} } = request.body;

        const scheduleExtraction = extractAndValidatePackScheduleFromBody(
          request.body,
          osqueryContext.experimentalFeatures.rruleScheduling
        );
        if (!scheduleExtraction.ok) {
          return response.badRequest({ body: scheduleExtraction.error });
        }

        const { packSchedule, queries: rawQueries } = scheduleExtraction.result;

        let currentPackSO;
        try {
          currentPackSO = await spaceScopedClient.get<PackSavedObject>(
            packSavedObjectType,
            request.params.id
          );
        } catch (err) {
          if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
            return response.notFound({
              body: { message: `Pack ${request.params.id} not found` },
            });
          }

          throw err;
        }

        const existingScheduleIds = keyBy(
          (currentPackSO.attributes.queries ?? []).filter(
            (q: { id: string; schedule_id?: string }) => q.schedule_id
          ),
          'id'
        );
        const now = moment().toISOString();
        const queries = rawQueries
          ? (mapValues(rawQueries, (queryData, queryId) => {
              const existing = existingScheduleIds[queryId];

              return {
                ...queryData,
                schedule_id: existing?.schedule_id ?? uuidv4(),
                start_date: existing?.start_date ?? now,
              };
            }) as Record<string, PackQueryInput>)
          : undefined;

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
          policyHasPack(packagePolicy, currentPackSO.attributes.name, spaceId)
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

        // Trade-off on schedule transitions: SavedObjectsClient.update is a
        // shallow merge, and Kibana's pack mappings reject `null` for
        // `interval`. So switching `schedule_type` from 'interval' → 'rrule' (or
        // vice versa) leaves the prior mode's value as a stale attribute on the
        // SO. The active mode is unambiguous because Fleet-config fan-out and
        // the API response are both built from the validated `packSchedule`
        // (discriminated by `schedule_type`), not from the raw SO.
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
            updated_by_profile_uid: profileUid,
            shards: convertShardsToArray(shards),
            ...(packSchedule.schedule_type ? { schedule_type: packSchedule.schedule_type } : {}),
            ...(packSchedule.interval != null ? { interval: packSchedule.interval } : {}),
            ...(packSchedule.rrule_schedule ? { rrule_schedule: packSchedule.rrule_schedule } : {}),
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

                      const pk = makePackKey(updatedPackSO.attributes.name, spaceId);
                      removePackFromPolicy(draft, updatedPackSO.attributes.name, spaceId);
                      set(draft, `inputs[0].config.osquery.value.packs.${pk}`, {
                        shard: policyShards[agentPolicyId] ?? 100,
                        pack_id: updatedPackSO.id,
                        queries: convertSOQueriesToPackConfig(
                          updatedPackSO.attributes.queries,
                          spaceId,
                          {
                            schedule_type: updatedPackSO.attributes.schedule_type,
                            interval: updatedPackSO.attributes.interval,
                            rrule_schedule: updatedPackSO.attributes.rrule_schedule,
                          }
                        ),
                      });

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
                    removePackFromPolicy(draft, currentPackSO.attributes.name, spaceId);

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
                    removePackFromPolicy(draft, currentPackSO.attributes.name, spaceId);

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
                      removePackFromPolicy(draft, currentPackSO.attributes.name, spaceId);
                    }

                    const pk = makePackKey(updatedPackSO.attributes.name, spaceId);
                    removePackFromPolicy(draft, updatedPackSO.attributes.name, spaceId);
                    set(draft, `inputs[0].config.osquery.value.packs.${pk}`, {
                      shard: policyShards[agentPolicyId] ?? 100,
                      pack_id: updatedPackSO.id,
                      queries: convertSOQueriesToPackConfig(
                        updatedPackSO.attributes.queries,
                        spaceId,
                        {
                          schedule_type: updatedPackSO.attributes.schedule_type,
                          interval: updatedPackSO.attributes.interval,
                          rrule_schedule: updatedPackSO.attributes.rrule_schedule,
                        }
                      ),
                    });

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

                    const pk = makePackKey(updatedPackSO.attributes.name, spaceId);
                    set(draft, `inputs[0].config.osquery.value.packs.${pk}`, {
                      shard: policyShards[agentPolicyId] ?? 100,
                      pack_id: updatedPackSO.id,
                      queries: convertSOQueriesToPackConfig(
                        updatedPackSO.attributes.queries,
                        spaceId,
                        {
                          schedule_type: updatedPackSO.attributes.schedule_type,
                          interval: updatedPackSO.attributes.interval,
                          rrule_schedule: updatedPackSO.attributes.rrule_schedule,
                        }
                      ),
                    });

                    return draft;
                  })
                );
              }
            })
          );
        }

        const { attributes } = updatedPackSO;

        // Build discriminated schedule fields for the response: emit only the
        // fields that match the active `schedule_type`. Stale attributes left
        // on the SO by transition merges (see comment near the update call) are
        // intentionally not surfaced.
        const responseScheduleFields: Pick<
          PackResponseData,
          'schedule_type' | 'interval' | 'rrule_schedule'
        > =
          attributes.schedule_type === 'rrule'
            ? {
                schedule_type: 'rrule',
                rrule_schedule: attributes.rrule_schedule,
              }
            : attributes.schedule_type === 'interval'
            ? {
                schedule_type: 'interval',
                interval: attributes.interval,
              }
            : {};

        const data: PackResponseData = {
          name: attributes.name,
          description: attributes.description,
          queries: attributes.queries,
          version: attributes.version,
          enabled: attributes.enabled,
          created_at: attributes.created_at,
          created_by: attributes.created_by,
          created_by_profile_uid: attributes.created_by_profile_uid,
          updated_at: attributes.updated_at,
          updated_by: attributes.updated_by,
          updated_by_profile_uid: attributes.updated_by_profile_uid,
          policy_ids: attributes.policy_ids,
          shards: attributes.shards,
          saved_object_id: updatedPackSO.id,
          ...responseScheduleFields,
        };

        return response.ok({
          body: { data },
        });
      }
    );
};
