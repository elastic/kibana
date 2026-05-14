/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { ClaimNudgeTarget } from '../claim_nudge';

export interface ClaimNudgeRouteParams {
  router: IRouter;
  logger: Logger;
  shouldRunTasks: boolean;
  onClaimNudge: (source: string, taskTargets: ClaimNudgeTarget[]) => void;
}

const claimNudgeBodySchema = schema.object({
  taskTargets: schema.maybe(
    schema.arrayOf(
      schema.object({
        taskId: schema.string(),
        version: schema.string(),
        taskType: schema.string(),
      })
    )
  ),
});

export function claimNudgeRoute({
  router,
  logger,
  shouldRunTasks,
  onClaimNudge,
}: ClaimNudgeRouteParams) {
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
      validate: {
        body: schema.maybe(claimNudgeBodySchema),
      },
      xsrfRequired: false,
      options: {
        access: 'public',
      },
    },
    async (_, request, response) => {
      if (!shouldRunTasks) {
        logger.info(
          '[claim_nudge] received_nudge but node is not running background tasks, ignoring'
        );
        return response.ok({ body: { acknowledged: true } });
      }

      onClaimNudge(request.id, request.body?.taskTargets ?? []);
      return response.ok({ body: { acknowledged: true } });
    }
  );
}
