/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { notificationIdSchema } from '../../common/notification_schema';
import { MARK_READ_PATH, NOTIFICATION_CENTER_API_VERSION } from '../../common/routes';
import { markRead } from '../lib/read_state';
import { NC_AUTHZ_OPT_OUT_REASON, type NotificationRouteDeps } from './route_deps';

const markReadBodySchema = z.object({ notification_id: notificationIdSchema }).strict();

/**
 * `POST /internal/notification_center/notifications/_mark_read`
 * Mark an individual notification as read by adding it to the user's overrides object.
 * Anonymous users (no `profile_uid`) have no read-state to write, so the call is forbidden.
 */
export const registerMarkReadRoute = ({ router, core }: NotificationRouteDeps) => {
  router.versioned
    .post({
      access: 'internal',
      path: MARK_READ_PATH,
      security: { authz: { enabled: false, reason: NC_AUTHZ_OPT_OUT_REASON } },
    })
    .addVersion(
      {
        version: NOTIFICATION_CENTER_API_VERSION,
        validate: { request: { body: buildRouteValidationWithZod(markReadBodySchema) } },
      },
      async (_context, request, response) => {
        const [{ userStorage }] = await core.getStartServices();
        const client = userStorage.asScoped(request);
        if (!client) {
          return response.forbidden({
            body: { message: 'A user profile is required to modify read state.' },
          });
        }
        const { notification_id: notificationId } = request.body;
        await markRead(client, notificationId);
        return response.ok({ body: { success: true } });
      }
    );
};
