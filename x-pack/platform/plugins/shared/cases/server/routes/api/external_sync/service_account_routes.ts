/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CoreServiceAccountsService } from '@kbn/core/server';
import { INTERNAL_EXTERNAL_SYNC_SERVICE_ACCOUNT_URL } from '../../../../common/constants';
import type { externalSyncApiV1 } from '../../../../common/types/api';
import {
  ExternalSyncConnectorParamsSchema,
  ExternalSyncServiceAccountBindRequestSchema,
} from '../../../../common/types/api';
import { decodeWithExcessOrThrowZod } from '../../../common/runtime_types';
import { createCaseError } from '../../../common/error';
import { EXTERNAL_SYNC_WORKLOAD_TYPE } from '../../../external_sync/service_account';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { createCasesRoute } from '../create_cases_route';
import type { CaseRoute } from '../types';
import { getNotificationParser } from './get_notification_parser';
import type { ExternalSyncRouteDeps } from './types';

const decodeParams = decodeWithExcessOrThrowZod(ExternalSyncConnectorParamsSchema);

const toBindingResponse = ({
  serviceAccountId,
  boundAt,
}: {
  serviceAccountId: string;
  boundAt: string;
}): externalSyncApiV1.ExternalSyncServiceAccountBinding => ({
  service_account_id: serviceAccountId,
  bound_at: boundAt,
});

const getEnabledServiceAccounts = async (
  getStartServices: ExternalSyncRouteDeps['getStartServices']
): Promise<CoreServiceAccountsService> => {
  const { serviceAccounts } = await getStartServices();
  if (!serviceAccounts.isEnabled()) {
    throw Boom.badRequest('Service accounts are not enabled on this Kibana.');
  }
  return serviceAccounts;
};

/**
 * Routes that choose the service account a connector's incident changes are applied as.
 * Core requires `manage_security` to bind or unbind; reading needs access to the connector.
 */
export const getExternalSyncServiceAccountRoutes = ({
  getStartServices,
  getActionsClient,
  getSpaceId,
}: ExternalSyncRouteDeps): CaseRoute[] => [
  createCasesRoute({
    method: 'get',
    path: INTERNAL_EXTERNAL_SYNC_SERVICE_ACCOUNT_URL,
    security: DEFAULT_CASES_ROUTE_SECURITY,
    routerOptions: {
      access: 'internal',
      summary: 'Get the service account a connector syncs cases as',
    },
    handler: async ({ request, response }) => {
      try {
        const { connector_id: connectorId } = decodeParams(request.params);
        await getNotificationParser(await getActionsClient(request), connectorId);

        const serviceAccounts = await getEnabledServiceAccounts(getStartServices);
        const binding = await serviceAccounts.getWorkloadBinding({
          spaceId: getSpaceId(request),
          workloadType: EXTERNAL_SYNC_WORKLOAD_TYPE,
          workloadId: connectorId,
        });

        const body: externalSyncApiV1.ExternalSyncServiceAccountResponse = {
          binding: binding != null ? toBindingResponse(binding) : null,
        };

        return response.ok({ body });
      } catch (error) {
        throw createCaseError({
          message: `Failed to get the sync service account of the connector: ${error}`,
          error,
        });
      }
    },
  }),
  createCasesRoute({
    method: 'put',
    path: INTERNAL_EXTERNAL_SYNC_SERVICE_ACCOUNT_URL,
    security: DEFAULT_CASES_ROUTE_SECURITY,
    routerOptions: {
      access: 'internal',
      summary: 'Bind the service account a connector syncs cases as',
    },
    handler: async ({ request, response }) => {
      try {
        const { connector_id: connectorId } = decodeParams(request.params);
        const { service_account_id: serviceAccountId } = decodeWithExcessOrThrowZod(
          ExternalSyncServiceAccountBindRequestSchema
        )(request.body);
        await getNotificationParser(await getActionsClient(request), connectorId);

        const serviceAccounts = await getEnabledServiceAccounts(getStartServices);
        const binding = await serviceAccounts.bindWorkload(request, {
          workloadType: EXTERNAL_SYNC_WORKLOAD_TYPE,
          workloadId: connectorId,
          serviceAccountId,
        });

        const body: externalSyncApiV1.ExternalSyncServiceAccountResponse = {
          binding: toBindingResponse(binding),
        };

        return response.ok({ body });
      } catch (error) {
        throw createCaseError({
          message: `Failed to bind the sync service account of the connector: ${error}`,
          error,
        });
      }
    },
  }),
  createCasesRoute({
    method: 'delete',
    path: INTERNAL_EXTERNAL_SYNC_SERVICE_ACCOUNT_URL,
    security: DEFAULT_CASES_ROUTE_SECURITY,
    routerOptions: {
      access: 'internal',
      summary: 'Unbind the service account a connector syncs cases as',
    },
    // No connector check: a deleted connector must still be unbindable.
    handler: async ({ request, response }) => {
      try {
        const { connector_id: connectorId } = decodeParams(request.params);

        const serviceAccounts = await getEnabledServiceAccounts(getStartServices);
        const unbound = await serviceAccounts.unbindWorkload(request, {
          workloadType: EXTERNAL_SYNC_WORKLOAD_TYPE,
          workloadId: connectorId,
        });

        const body: externalSyncApiV1.ExternalSyncServiceAccountUnbindResponse = { unbound };

        return response.ok({ body });
      } catch (error) {
        throw createCaseError({
          message: `Failed to unbind the sync service account of the connector: ${error}`,
          error,
        });
      }
    },
  }),
];
