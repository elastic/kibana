/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { GET_NOTIFICATIONS_PATH, NOTIFICATION_CENTER_API_VERSION } from '../../common/routes';
import { notificationQueryParamsSchema } from '../../common/notification_schema';
import { queryNotifications } from '../lib/query_notifications';
import { getReadState } from '../lib/read_state';
import { NC_AUTHZ_OPT_OUT_REASON, type NotificationRouteDeps } from './route_deps';

/**
 * `GET /internal/notification_center/notifications`
 * Validates the query params and calls the internal queryNotifications function.
 * Items carry the caller's `isRead` state; callers without a user profile (API keys)
 * get the list without it.
 */
export const registerGetNotificationsRoute = ({ router, core, logger }: NotificationRouteDeps) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_NOTIFICATIONS_PATH,
      security: { authz: { enabled: false, reason: NC_AUTHZ_OPT_OUT_REASON } },
    })
    .addVersion(
      {
        version: NOTIFICATION_CENTER_API_VERSION,
        validate: {
          request: { query: buildRouteValidationWithZod(notificationQueryParamsSchema) },
        },
      },
      async (_context, request, response) => {
        const [{ dataStreams, userStorage }] = await core.getStartServices();
        const client = userStorage.asScoped(request);
        // read-state fetch runs concurrently with the ES query
        const readState = client ? getReadState(client, logger) : undefined;
        const result = await queryNotifications({ dataStreams, logger }, request.query, readState);
        return response.ok({ body: result });
      }
    );
};
