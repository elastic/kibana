/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MARK_ALL_READ_PATH, NOTIFICATION_CENTER_API_VERSION } from '../../common/routes';
import { markAllRead } from '../lib/read_state';
import { NC_AUTHZ_OPT_OUT_REASON, type NotificationRouteDeps } from '.';

/**
 * `POST /internal/notification_center/notifications/_mark_all_read`
 * Advance the caller's `readAllBefore` marker to now and clear the per-id list. Returns
 * the new marker. Anonymous callers (no `profile_uid`) have no read-state, so forbidden.
 */
export const registerMarkAllReadRoute = ({ router, core }: NotificationRouteDeps) => {
  router.versioned
    .post({
      access: 'internal',
      path: MARK_ALL_READ_PATH,
      security: { authz: { enabled: false, reason: NC_AUTHZ_OPT_OUT_REASON } },
    })
    .addVersion(
      { version: NOTIFICATION_CENTER_API_VERSION, validate: false },
      async (_context, request, response) => {
        const [{ userStorage }] = await core.getStartServices();
        const client = userStorage.asScoped(request);
        if (!client) {
          return response.forbidden({
            body: { message: 'A user profile is required to modify read state.' },
          });
        }
        const readAllBefore = await markAllRead(client);
        return response.ok({ body: { success: true, readAllBefore } });
      }
    );
};
