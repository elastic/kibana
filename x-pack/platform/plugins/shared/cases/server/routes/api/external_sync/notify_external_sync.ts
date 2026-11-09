/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_EXTERNAL_SYNC_NOTIFY_URL } from '../../../../common/constants';
import type { externalSyncApiV1 } from '../../../../common/types/api';
import { ExternalSyncConnectorParamsSchema } from '../../../../common/types/api';
import { decodeWithExcessOrThrowZod } from '../../../common/runtime_types';
import { createCaseError } from '../../../common/error';
import {
  externalIncidentUpdatedTopic,
  getExternalIncidentEventId,
} from '../../../external_sync/external_incident_topic';
import { EXTERNAL_SYNC_WORKLOAD_TYPE } from '../../../external_sync/service_account';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { createCasesRoute } from '../create_cases_route';
import { getNotificationParser } from './get_notification_parser';
import type { ExternalSyncRouteDeps } from './types';

/**
 * Receives a change notification from Jira or ServiceNow and queues a sync of the cases pushed
 * to the incident. The caller only has to read the connector and the cases; the sync itself runs
 * as the service account bound to the connector.
 */
export const notifyExternalSyncRoute = ({
  getStartServices,
  getActionsClient,
  getSpaceId,
}: ExternalSyncRouteDeps) =>
  createCasesRoute({
    method: 'post',
    path: CASE_EXTERNAL_SYNC_NOTIFY_URL,
    security: DEFAULT_CASES_ROUTE_SECURITY,
    routerOptions: {
      access: 'public',
      summary: 'Notify cases that an external incident changed',
      description:
        'Technical preview. Called by a Jira webhook or a ServiceNow business rule when an incident changes. Syncs every case pushed to the incident, as the service account bound to the connector.',
      tags: ['oas-tag:cases'],
    },
    handler: async ({ context, request, response }) => {
      try {
        const { connector_id: connectorId } = decodeWithExcessOrThrowZod(
          ExternalSyncConnectorParamsSchema
        )(request.params);

        const parseNotification = await getNotificationParser(
          await getActionsClient(request),
          connectorId
        );
        const notification = parseNotification(request.body);
        if (notification == null) {
          return response.badRequest({
            body: { message: 'The request body is not an incident change for this connector.' },
          });
        }

        const casesClient = await (await context.cases).getCasesClient();
        const cases = await casesClient.cases.findByExternalId({
          externalId: notification.externalId,
          connectorId,
        });
        if (cases.length === 0) {
          return response.notFound({
            body: { message: 'No case was pushed to this incident through this connector.' },
          });
        }

        const { pubsub, serviceAccounts } = await getStartServices();
        if (!serviceAccounts.isEnabled()) {
          return response.badRequest({
            body: { message: 'Service accounts are not enabled on this Kibana.' },
          });
        }

        const spaceId = getSpaceId(request);
        const binding = await serviceAccounts.getWorkloadBinding({
          spaceId,
          workloadType: EXTERNAL_SYNC_WORKLOAD_TYPE,
          workloadId: connectorId,
        });
        if (binding == null) {
          return response.conflict({
            body: {
              message:
                'No service account is bound to the sync of this connector. Bind one before sending incident changes.',
            },
          });
        }

        const data = { spaceId, connectorId, ...notification };
        const { id, acceptedAt } = await pubsub.publish(externalIncidentUpdatedTopic, {
          id: getExternalIncidentEventId(data),
          data,
        });

        const body: externalSyncApiV1.ExternalSyncNotifyResponse = {
          id,
          accepted_at: acceptedAt,
          cases: cases.length,
        };

        return response.accepted({ body });
      } catch (error) {
        throw createCaseError({
          message: `Failed to accept the incident change in route: ${error}`,
          error,
        });
      }
    },
  });
