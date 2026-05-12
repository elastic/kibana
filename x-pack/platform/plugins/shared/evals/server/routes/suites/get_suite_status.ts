/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { SuiteRouteDependencies } from '.';

const paramsSchema = z.object({ suiteId: z.string() });

export function registerGetSuiteStatusRoute({ router, suiteRunner }: SuiteRouteDependencies) {
  router.versioned
    .get({
      path: '/internal/evals/suites/{suiteId}/status',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(paramsSchema),
          },
        },
      },
      async (_context, request, response) => {
        const { suiteId } = request.params;

        if (!suiteRunner) {
          return response.ok({ body: { status: 'idle', suite_id: suiteId } });
        }

        // Check if there's an active or recent run for this suite
        const runs = suiteRunner.listRuns().filter((r) => r.suiteId === suiteId);

        if (runs.length === 0) {
          return response.ok({ body: { status: 'idle', suite_id: suiteId } });
        }

        const latest = runs[0];
        return response.ok({
          body: {
            suite_id: suiteId,
            run_id: latest.runId,
            status: latest.status,
            started_at: latest.startedAt,
            completed_at: latest.completedAt,
            exit_code: latest.exitCode,
            error: latest.error,
            output: latest.output,
          },
        });
      }
    );
}
