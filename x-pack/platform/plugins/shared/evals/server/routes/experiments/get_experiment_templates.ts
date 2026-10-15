/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EXPERIMENT_TEMPLATES_URL,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type {
  ExperimentTemplate,
  GetExperimentTemplatesResponse,
} from '../../../common/experiments/run_experiment';
import { BUILT_IN_TASK_PROVIDERS } from '../../task_providers/types';
import type { RouteDependencies } from '../register_routes';

const STARTER_TEMPLATES: ExperimentTemplate[] = [
  {
    id: BUILT_IN_TASK_PROVIDERS.inference,
    name: 'Direct model evaluation',
    description: 'Evaluate the raw output of a model connector for each example.',
    kind: 'starter',
  },
  {
    id: BUILT_IN_TASK_PROVIDERS.agentBuilderConverse,
    name: 'Agent Builder agent',
    description: 'Evaluate a full Agent Builder agent conversation for each example.',
    kind: 'starter',
  },
];

/**
 * Lists the templates that seed the new-experiment form: the built-in starters
 * plus any suite-owned task providers registered via `registerTaskProvider`.
 */
export const registerGetExperimentTemplatesRoute = ({
  router,
  taskProviderRegistry,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENT_TEMPLATES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'List experiment templates and registered task providers',
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: false },
      async (context, request, response) => {
        const builtInIds = new Set<string>(Object.values(BUILT_IN_TASK_PROVIDERS));
        const templates: ExperimentTemplate[] = [...STARTER_TEMPLATES];

        for (const provider of taskProviderRegistry?.list() ?? []) {
          if (builtInIds.has(provider.name)) {
            continue;
          }
          templates.push({
            id: provider.name,
            name: provider.name,
            description: provider.description,
            kind: 'task_provider',
            prefill: { task_ref: provider.name },
          });
        }

        const responseBody: GetExperimentTemplatesResponse = { templates };
        return response.ok({ body: responseBody });
      }
    );
};
