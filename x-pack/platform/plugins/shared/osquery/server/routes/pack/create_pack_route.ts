/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { set } from '@kbn/safer-lodash-set';
import { has, unset, some, mapKeys } from 'lodash';
import { produce } from 'immer';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';

import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import type { CreatePackRequestBodySchema } from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { PLUGIN_ID } from '../../../common';
import { packSavedObjectType } from '../../../common/types';
import {
  convertSOQueriesToPackConfig,
  convertPackQueriesToSO,
  findMatchingShards,
  getInitialPolicies,
} from './utils';
import { convertShardsToArray } from '../utils';
import type { PackSavedObject } from '../../common/types';
import type { PackResponseData } from './types';
import { createPackRequestBodySchema } from '../../../common/api';
import { getUserInfo } from '../../lib/get_user_info';
import { escapeFilterValue } from '../utils/generate_copy_name';

type PackSavedObjectLimited = Omit<PackSavedObject, 'saved_object_id' | 'references'>;

export const createPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/osquery/packs',
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
            body: buildRouteValidation<
              typeof createPackRequestBodySchema,
              CreatePackRequestBodySchema
            >(createPackRequestBodySchema),
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

        const { name, description, queries, enabled, policy_ids, shards = {} } = request.body;
        const conflictingEntries = await spaceScopedClient.find({
          type: packSavedObjectType,
          filter: `${packSavedObjectType}.attributes.name: "${escapeFilterValue(name)}"`,
        });

        if (
          conflictingEntries.saved_objects.length &&
          some(conflictingEntries.saved_objects, ['attributes.name', name])
        ) {
          return response.conflict({ body: `Pack with name "${name}" already exists.` });
        }

        const { items: packagePolicies } = (await packagePolicyService?.list(spaceScopedClient, {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
          perPage: 1000,
          page: 1,
        })) ?? { items: [] };

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

        const references = policiesList.map((id) => ({
          id,
          name: agentPoliciesIdMap[id]?.name,
          type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
        }));

        const packSO = await spaceScopedClient.create<PackSavedObjectLimited>(
          packSavedObjectType,
          {
            name,
            description,
            queries: convertPackQueriesToSO(queries),
            enabled,
            created_at: moment().toISOString(),
            created_by: username,
            updated_at: moment().toISOString(),
            updated_by: username,
            shards: convertShardsToArray(shards),
          },
          {
            references,
            refresh: 'wait_for',
          }
        );

        if (enabled && policiesList.length) {
          await Promise.all(
            policiesList.map((agentPolicyId) => {
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

                    set(draft, `inputs[0].config.osquery.value.packs.${packSO.attributes.name}`, {
                      shard: policyShards[agentPolicyId] ?? 100,
                      queries: convertSOQueriesToPackConfig(queries),
                    });

                    return draft;
                  })
                );
              }
            })
          );
        }

        set(packSO, 'attributes.queries', queries);

        const { attributes } = packSO;

        const data: PackResponseData = {
          name: attributes.name,
          description: attributes.description,
          queries: attributes.queries,
          version: attributes.version,
          enabled: attributes.enabled,
          created_at: attributes.created_at,
          created_by: attributes.created_by,
          updated_at: attributes.updated_at,
          updated_by: attributes.updated_by,
          policy_ids: attributes.policy_ids,
          shards: attributes.shards,
          saved_object_id: packSO.id,
        };

        return response.ok({
          body: {
            data,
          },
        });
      }
    );
};
