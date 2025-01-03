/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has, filter, unset } from 'lodash';
import { produce } from 'immer';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';
import { getInternalSavedObjectsClient } from '../utils';
import type { DeletePacksRequestParamsSchema } from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { PLUGIN_ID } from '../../../common';

import { packSavedObjectType } from '../../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { deletePacksRequestParamsSchema } from '../../../common/api';

export const deletePackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .delete({
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
              typeof deletePacksRequestParamsSchema,
              DeletePacksRequestParamsSchema
            >(deletePacksRequestParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;
        const savedObjectsClient = coreContext.savedObjects.client;
        const internalSavedObjectsClient = await getInternalSavedObjectsClient(
          osqueryContext.getStartServices
        );
        const packagePolicyService = osqueryContext.service.getPackagePolicyService();

        const currentPackSO = await savedObjectsClient.get<{ name: string }>(
          packSavedObjectType,
          request.params.id
        );

        await savedObjectsClient.delete(packSavedObjectType, request.params.id, {
          refresh: 'wait_for',
        });

        const { items: packagePolicies } = (await packagePolicyService?.list(savedObjectsClient, {
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

        await Promise.all(
          currentPackagePolicies.map((packagePolicy) =>
            packagePolicyService?.update(
              internalSavedObjectsClient,
              esClient,
              packagePolicy.id,
              produce(packagePolicy, (draft) => {
                unset(draft, 'id');
                unset(
                  draft,
                  `inputs[0].config.osquery.value.packs.${[currentPackSO.attributes.name]}`
                );

                return draft;
              })
            )
          )
        );

        return response.ok({
          body: {},
        });
      }
    );
};
