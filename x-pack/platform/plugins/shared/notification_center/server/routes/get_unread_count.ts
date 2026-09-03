/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GET_UNREAD_COUNT_PATH, NOTIFICATION_CENTER_API_VERSION } from '../../common/routes';
import { queryUnreadCount } from '../lib/query_unread_count';
import { getReadState } from '../lib/read_state';
import { NC_AUTHZ_OPT_OUT_REASON, type NotificationRouteDeps } from './route_deps';

/** Register the unread-count endpoint for callers with profile-scoped read state. */
export const registerGetUnreadCountRoute = ({
  router,
  core,
  logger,
}: NotificationRouteDeps): void => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_UNREAD_COUNT_PATH,
      security: { authz: { enabled: false, reason: NC_AUTHZ_OPT_OUT_REASON } },
    })
    .addVersion(
      { version: NOTIFICATION_CENTER_API_VERSION, validate: false },
      async (_context, request, response) => {
        const [{ dataStreams, userStorage }] = await core.getStartServices();
        const client = userStorage.asScoped(request);
        if (!client) {
          return response.forbidden({
            body: { message: 'A user profile is required to read notification unread state.' },
          });
        }

        const readState = await getReadState(client, logger);
        if (!readState) {
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to read notification unread state.' },
          });
        }

        const result = await queryUnreadCount({ dataStreams, logger }, readState);
        return response.ok({ body: result });
      }
    );
};
