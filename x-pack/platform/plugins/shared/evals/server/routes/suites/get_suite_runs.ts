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

export function registerGetSuiteRunsRoute({ router, suiteRunner }: SuiteRouteDependencies) {
  router.versioned
    .get({
      path: '/internal/evals/suites/{suiteId}/runs',
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
          return response.ok({ body: { runs: [] } });
        }

        const runs = suiteRunner
          .listRuns()
          .filter((r) => r.suiteId === suiteId)
          .map((r) => ({
            run_id: r.runId,
            suite_id: r.suiteId,
            status: r.status,
            started_at: r.startedAt,
            completed_at: r.completedAt,
            exit_code: r.exitCode,
            error: r.error,
            output: r.output,
          }));

        return response.ok({ body: { runs } });
      }
    );
}
