/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import type { ReportingCore } from '../../..';
import { authorizedUserPreRouting } from '../../common';

const path = INTERNAL_ROUTES.HEALTH;
export const registerHealthRoute = (reporting: ReportingCore, logger: Logger) => {
  const { router } = reporting.getPluginSetupDeps();

  router.get(
    {
      path,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: false,
      options: { access: 'internal' },
    },
    authorizedUserPreRouting(reporting, async (_user, _context, req, res) => {
      try {
        const healthInfo = await reporting.getHealthInfo();
        return res.ok({
          body: {
            has_permanent_encryption_key: healthInfo.hasPermanentEncryptionKey,
            is_sufficiently_secure: healthInfo.isSufficientlySecure,
            are_notifications_enabled: healthInfo.areNotificationsEnabled,
          },
        });
      } catch (err) {
        logger.error(err);
        return res.custom({ statusCode: 500 });
      }
    })
  );
};
