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
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { type IRouter, SavedObjectsErrorHelpers } from '@kbn/core/server';

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import type {
  UpdatePacksRequestParamsSchema,
  UpdatePacksRequestBodySchema,
} from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import type { RRuleScheduleConfig } from '../../../common';
import { packSavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { StartPlugins } from '../../types';
import { PLUGIN_ID } from '../../../common';
import {
  convertSOQueriesToPack,
  convertPackQueriesToSO,
  convertSOQueriesToPackConfig,
  fetchAllPackagePolicies,
  getInitialPolicies,
  findMatchingShards,
  groupAgentPolicyIdsByPackagePolicy,
  policyHasPack,
  removePackFromPolicy,
  makePackKey,
  resolveSharedPackagePolicyShard,
  validatePackScheduleFields,
  resolvePackScheduleForUpdate,
  buildScheduleResponseSlice,
  stripPerQueryRruleFields,
  stripPriorModePerQueryFields,
  resolvePreservedQueries,
} from './utils';

import { convertShardsToArray, convertShardsToObject } from '../utils';
import type { PackSavedObject } from '../../common/types';
import type { PackResponseData } from './types';
import type { PackQueryInput, PreservableQueryFields } from './utils';
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

        const isRruleFeatureEnabled = osqueryContext.experimentalFeatures.rruleScheduling;

        const {
          name,
          description,
          queries: rawQueries,
          enabled,
          policy_ids,
          shards = {},
          schedule_type: rawScheduleType,
          interval: rawInterval,
          rrule_schedule: rawRruleSchedule,
        } = request.body;

        // Request-boundary feature-flag gate. Any RRULE-shaped field on the
        // body is considered "present" only when the flag is on; the wire-
        // boundary gate handles the read/Fleet-push side independently.
        const scheduleTypePresent = isRruleFeatureEnabled && rawScheduleType !== undefined;
        const intervalPresent = isRruleFeatureEnabled && rawInterval !== undefined;
        const rruleSchedulePresent = isRruleFeatureEnabled && rawRruleSchedule !== undefined;

        const gatedQueries: Record<string, PackQueryInput> | undefined = isRruleFeatureEnabled
          ? (rawQueries as Record<string, PackQueryInput> | undefined)
          : rawQueries
          ? (mapValues(rawQueries, (rawQuery) => {
              const {
                schedule_type: _scheduleType,
                rrule_schedule: _rruleSchedule,
                ...rest
              } = rawQuery as PackQueryInput;

              return rest;
            }) as Record<string, PackQueryInput>)
          : undefined;

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

        // Index of current SO queries by id, carrying schedule_id/start_date
        // to preserve across edit-save.
        const existingQueriesById = keyBy(currentPackSO.attributes.queries ?? [], 'id') as Record<
          string,
          PreservableQueryFields
        >;

        const resolved = resolvePackScheduleForUpdate({
          current: {
            schedule_type: currentPackSO.attributes.schedule_type,
            interval: currentPackSO.attributes.interval,
            rrule_schedule: currentPackSO.attributes.rrule_schedule,
          },
          request: {
            schedule_type: rawScheduleType,
            interval: rawInterval,
            rrule_schedule: rawRruleSchedule,
            scheduleTypePresent,
            intervalPresent,
            rruleSchedulePresent,
          },
          isRruleFeatureEnabled,
        });

        const now = moment().toISOString();

        // On a mode transition, hydrate queries from the SO when the request
        // omits them, then strip prior-mode fields — otherwise stale
        // cross-mode state leaks via GET.
        const baseQueries =
          gatedQueries ??
          (resolved.transitioned
            ? (convertSOQueriesToPack(currentPackSO.attributes.queries ?? []) as Record<
                string,
                PackQueryInput
              >)
            : undefined);

        // Map each outgoing query to the stored row it preserves schedule_id from.
        const resolvedExistingByKey = baseQueries
          ? resolvePreservedQueries(baseQueries, existingQueriesById)
          : {};

        const queries = baseQueries
          ? (mapValues(baseQueries, (queryData, queryId) => {
              const existing = resolvedExistingByKey[queryId];
              const carried = resolved.transitioned
                ? stripPriorModePerQueryFields(queryData, resolved.scheduleType)
                : queryData;

              const existingRrule = existing?.rrule_schedule;
              const merged =
                !resolved.transitioned &&
                resolved.scheduleType === 'rrule' &&
                carried.schedule_type === 'rrule' &&
                carried.rrule_schedule &&
                existingRrule
                  ? {
                      ...carried,
                      rrule_schedule: { ...existingRrule, ...carried.rrule_schedule },
                    }
                  : carried;

              return {
                ...merged,
                schedule_id: existing?.schedule_id ?? uuidv4(),
                start_date: existing?.start_date ?? now,
              };
            }) as Record<string, PackQueryInput>)
          : undefined;

        const scheduleErr = validatePackScheduleFields({
          packScheduleType: resolved.scheduleType ?? undefined,
          packInterval: resolved.interval ?? undefined,
          packRrule: resolved.rrule_schedule ?? undefined,
          queries: queries as Record<string, PackQueryInput> | undefined,
        });
        if (scheduleErr) {
          return response.badRequest({ body: { message: scheduleErr } });
        }

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

        // Drain ALL policies via keyset `fetchAllItems`; an offset-capped
        // `list({ perPage: 1000 })` would drop the pack from policies past 1000.
        const packagePolicies = await fetchAllPackagePolicies(
          packagePolicyService,
          spaceScopedClient
        );

        const currentPackagePolicies = filter(packagePolicies, (packagePolicy) =>
          policyHasPack(packagePolicy, currentPackSO.attributes.name, spaceId)
        );

        // Preserve existing policy attachments when policy_ids is omitted, so
        // an unrelated PUT doesn't strip the pack from every policy.
        const currentAgentPolicyIds = map(
          filter(currentPackSO.references, ['type', LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE]),
          'id'
        );
        const effectivePolicyIds = policy_ids ?? currentAgentPolicyIds;

        const { policiesList, invalidPolicies } = getInitialPolicies(
          packagePolicies,
          effectivePolicyIds,
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

        const scheduleSoPatch: Partial<
          Pick<PackSavedObject, 'schedule_type' | 'interval' | 'rrule_schedule'>
        > = {};
        if (isRruleFeatureEnabled) {
          if (scheduleTypePresent) {
            scheduleSoPatch.schedule_type = resolved.scheduleType ?? null;
          }

          if (resolved.transitioned || intervalPresent) {
            scheduleSoPatch.interval = resolved.interval ?? null;
          }

          if (resolved.transitioned || rruleSchedulePresent) {
            // validatePackScheduleFields has already rejected any non-strict merged shape by this point.
            scheduleSoPatch.rrule_schedule = (resolved.rrule_schedule ??
              null) as RRuleScheduleConfig | null;
          }
        }

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
            ...scheduleSoPatch,
          },
          {
            refresh: 'wait_for',
            references,
          }
        );

        const updatedPackSO = await spaceScopedClient.get<PackSavedObject>(
          packSavedObjectType,
          request.params.id
        );

        const convertedQueries = stripPerQueryRruleFields(
          convertSOQueriesToPack(updatedPackSO.attributes.queries),
          isRruleFeatureEnabled
        );

        // `agentPolicyIds` carries every agent policy that resolved to the
        // package policy being written (see groupAgentPolicyIdsByPackagePolicy
        // below); a shared package policy needs one deterministic shard.
        const buildFleetPackBlock = (agentPolicyIds: string[]) => {
          const { queries: builtQueries, ...packDefaults } = convertSOQueriesToPackConfig(
            convertedQueries,
            {
              spaceId,
              packSchedule: {
                schedule_type: updatedPackSO.attributes.schedule_type,
                interval: updatedPackSO.attributes.interval,
                rrule_schedule: updatedPackSO.attributes.rrule_schedule,
              },
              isRruleFeatureEnabled,
            }
          );

          return {
            shard: resolveSharedPackagePolicyShard(agentPolicyIds, policyShards),
            pack_id: updatedPackSO.id,
            pack_name: updatedPackSO.attributes.name,
            ...packDefaults,
            queries: builtQueries,
          };
        };

        const buildResponseData = (): PackResponseData => {
          const { attributes: attrs } = updatedPackSO;
          // policy_ids and shards must mirror the GET contract: policy attachments
          // live on `references`, not `attributes`, and the public shards shape is
          // an object map (read_pack_route uses convertShardsToObject).
          const policyIds = map(
            filter(updatedPackSO.references, ['type', LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE]),
            'id'
          );

          return {
            name: attrs.name,
            description: attrs.description,
            queries: convertedQueries as unknown as PackResponseData['queries'],
            version: attrs.version,
            enabled: attrs.enabled,
            created_at: attrs.created_at,
            created_by: attrs.created_by,
            created_by_profile_uid: attrs.created_by_profile_uid,
            updated_at: attrs.updated_at,
            updated_by: attrs.updated_by,
            updated_by_profile_uid: attrs.updated_by_profile_uid,
            policy_ids: policyIds,
            // TODO: PackResponseData.shards should be the public object-map
            // shape; array form here is a leak of internal SO storage.
            shards: convertShardsToObject(attrs.shards) as unknown as PackResponseData['shards'],
            saved_object_id: updatedPackSO.id,
            ...buildScheduleResponseSlice(attrs, isRruleFeatureEnabled),
          };
        };

        if (enabled == null && !currentPackSO.attributes.enabled) {
          return response.ok({ body: { data: buildResponseData() } });
        }

        // The pack SO (source of truth) is already committed. These Fleet writes
        // only project it onto the wire, so a concurrent-write 409 → response.conflict
        // (client retries; reconciler also repairs). Other errors propagate.
        try {
          if (enabled != null && enabled !== currentPackSO.attributes.enabled) {
            if (enabled) {
              const policyIds =
                policy_ids || !isEmpty(shards) ? policiesList : currentAgentPolicyIds;
              // Dedup by resolved package-policy id before writing: a
              // shared package policy must be written exactly once.
              const packagePolicyWriteTargets = groupAgentPolicyIdsByPackagePolicy(
                policyIds,
                packagePolicies
              );

              await Promise.all(
                Array.from(packagePolicyWriteTargets.values()).map(
                  ({ packagePolicy, agentPolicyIds }) =>
                    packagePolicyService?.update(
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
                        set(
                          draft,
                          `inputs[0].config.osquery.value.packs.${pk}`,
                          buildFleetPackBlock(agentPolicyIds)
                        );

                        return draft;
                      })
                    )
                )
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
            // Diff current vs. target: remove the pack from policies no longer
            // targeted, then (re)write every still-targeted package policy once.
            const agentPolicyIdsToRemove = uniq(difference(currentAgentPolicyIds, policiesList));

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

            const packagePolicyWriteTargets = groupAgentPolicyIdsByPackagePolicy(
              policiesList,
              packagePolicies
            );

            await Promise.all(
              Array.from(packagePolicyWriteTargets.values()).map(
                ({ packagePolicy, agentPolicyIds }) =>
                  packagePolicyService?.update(
                    spaceScopedClient,
                    esClient,
                    packagePolicy.id,
                    produce<PackagePolicy>(packagePolicy, (draft) => {
                      unset(draft, 'id');
                      if (!has(draft, 'inputs[0].streams')) {
                        set(draft, 'inputs[0].streams', []);
                      }

                      // Rename cleanup: drop the pack under its previous name so a
                      // renamed pack doesn't linger under both keys.
                      if (updatedPackSO.attributes.name !== currentPackSO.attributes.name) {
                        removePackFromPolicy(draft, currentPackSO.attributes.name, spaceId);
                      }

                      const pk = makePackKey(updatedPackSO.attributes.name, spaceId);
                      removePackFromPolicy(draft, updatedPackSO.attributes.name, spaceId);
                      set(
                        draft,
                        `inputs[0].config.osquery.value.packs.${pk}`,
                        buildFleetPackBlock(agentPolicyIds)
                      );

                      return draft;
                    })
                  )
              )
            );
          }
        } catch (err) {
          const conflictStatus =
            (err as { output?: { statusCode?: number } }).output?.statusCode === 409 ||
            SavedObjectsErrorHelpers.isConflictError(err);
          if (conflictStatus) {
            return response.conflict({
              body: {
                message:
                  'The pack was saved, but its Fleet package policy was modified concurrently and could not be updated. Please retry the request.',
              },
            });
          }

          throw err;
        }

        return response.ok({
          body: { data: buildResponseData() },
        });
      }
    );
};
