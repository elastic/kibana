/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerGetExperimentSuitesRoute = ({
  router,
  experimentSuiteRegistry,
  workflowsManagement,
  workflowsExtensions,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: '/internal/evals/experiments/suites',
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'List experiment suites',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
      },
      async (_context, _request, response) => {
        // Surface plugin availability to the UI so it can render a friendly
        // empty state rather than letting the user click "Run now" and hit a
        // 503 on the next request. Both Workflows plugins are required:
        //   - workflowsExtensions: registers the `evals.runSuite` step type.
        //   - workflowsManagement: dispatches/observes/cancels executions.
        const missing: string[] = [];
        if (!workflowsExtensions) missing.push('workflowsExtensions');
        if (!workflowsManagement) missing.push('workflowsManagement');
        const available = missing.length === 0;

        return response.ok({
          body: {
            suites: experimentSuiteRegistry?.list() ?? [],
            available,
            ...(available
              ? {}
              : {
                  unavailable_reason: `Experiments require the Workflows plugins. Missing: ${missing.join(
                    ', '
                  )}.`,
                  missing_plugins: missing,
                }),
          },
        });
      }
    );
};
