/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import { pollCycleRecorder } from '../polling/poll_cycle_recorder';

const MAX_CYCLES = 50_000;

/** Registers a superuser-only route returning this node's recent poll cycles (perf builds only). */
export const perfPollCyclesRoute = ({
  router,
  taskManagerId,
}: {
  router: IRouter;
  taskManagerId?: string;
}): void => {
  router.get(
    {
      path: '/internal/task_manager/perf/poll_cycles',
      security: { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } },
      options: { access: 'internal', summary: 'Returns recent poll cycles of this node' },
      validate: {
        query: schema.object({
          since: schema.number({ min: 0, defaultValue: 0 }),
          limit: schema.number({ min: 1, max: MAX_CYCLES, defaultValue: MAX_CYCLES }),
        }),
      },
    },
    async (_ctx, req, res) => {
      const { since, limit } = req.query;
      return res.ok({
        body: {
          server_uuid: taskManagerId,
          now: Date.now(),
          cycles: pollCycleRecorder.since(since, limit),
        },
      });
    }
  );
};
