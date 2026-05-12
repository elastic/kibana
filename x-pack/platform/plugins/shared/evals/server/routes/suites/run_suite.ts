/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { SuiteRouteDependencies } from '.';
import { loadSuites } from './list_suites';

const paramsSchema = z.object({ suiteId: z.string() });

const bodySchema = z.object({
  connector_id: z.string().min(1),
  project: z.string().optional(),
  repetitions: z.number().min(1).max(100).optional(),
  grep: z.string().optional(),
});

export function registerRunSuiteRoute({
  router,
  logger,
  suiteRunner,
  repoRoot,
}: SuiteRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/evals/suites/{suiteId}/run',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
      options: { timeout: { idleSocket: 30_000 } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(paramsSchema),
            body: buildRouteValidationWithZod(bodySchema),
          },
        },
      },
      async (_context, request, response) => {
        const { suiteId } = request.params;
        const { connector_id: connectorId, project, repetitions, grep } = request.body;

        try {
          if (!suiteRunner) {
            return response.badRequest({
              body: { message: 'Suite runner not available' },
            });
          }

          // Validate suiteId exists
          const suites = loadSuites(repoRoot);
          const suite = suites.find((s) => s.id === suiteId);
          if (!suite) {
            return response.notFound({
              body: { message: `Suite "${suiteId}" not found in evals.suites.json` },
            });
          }

          const run = suiteRunner.startRun({
            suiteId,
            configPath: suite.configPath,
            connectorId,
            project,
            repetitions,
            grep,
          });

          return response.ok({
            body: {
              run_id: run.runId,
              suite_id: run.suiteId,
              status: run.status,
              started_at: run.startedAt,
            },
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`[Evals] Failed to start suite run: ${msg}`);
          return response.customError({
            statusCode: 500,
            body: { message: msg },
          });
        }
      }
    );
}
