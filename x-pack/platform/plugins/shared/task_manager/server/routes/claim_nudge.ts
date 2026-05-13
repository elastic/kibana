/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';

export interface ClaimNudgeRouteParams {
  router: IRouter;
  logger: Logger;
  shouldRunTasks: boolean;
  onClaimNudge: (source: string) => void;
}

export function claimNudgeRoute({ router, logger, shouldRunTasks, onClaimNudge }: ClaimNudgeRouteParams) {
  router.post(
    {
      path: '/internal/task_manager/_claim_nudge',
      security: {
        authc: {
          enabled: false,
          reason: 'Route supports internal Kibana-to-Kibana request authentication.',
        },
        authz: {
          enabled: false,
          reason: 'Route is internal system-to-system signaling.',
        },
      },
      validate: false,
      xsrfRequired: false,
      options: {
        access: 'public',
      },
    },
    async (_, request, response) => {
      if (!shouldRunTasks) {
        logger.info('[claim_nudge] received_nudge but node is not running background tasks, ignoring');
        return response.ok({ body: { acknowledged: true } });
      }

      onClaimNudge(request.id);
      return response.ok({ body: { acknowledged: true } });
    }
  );
}
