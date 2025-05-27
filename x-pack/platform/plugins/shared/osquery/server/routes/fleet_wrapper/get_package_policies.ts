/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { getInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID, OSQUERY_INTEGRATION_NAME } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const getPackagePoliciesRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/fleet_wrapper/package_policies',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-read`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {},
      },
      async (context, request, response) => {
        const space = await osqueryContext.service.getActiveSpace(request);
        const [core] = await osqueryContext.getStartServices();
        const spaceScopedClient = getInternalSavedObjectsClientForSpaceId(
          core,
          space?.id ?? DEFAULT_SPACE_ID
        );

        const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${OSQUERY_INTEGRATION_NAME}`;
        const packagePolicyService = osqueryContext.service.getPackagePolicyService();
        const policies = await packagePolicyService?.list(spaceScopedClient, {
          kuery,
          perPage: 1000,
        });

        return response.ok({
          body: policies,
        });
      }
    );
};
