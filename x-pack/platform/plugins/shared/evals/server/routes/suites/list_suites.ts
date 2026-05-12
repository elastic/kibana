/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { readFileSync } from '@kbn/fs';
import type { SuiteRouteDependencies } from '.';

interface SuiteDefinition {
  id: string;
  name: string;
  configPath: string;
  tags: string[];
  slackChannel?: string;
  ciLabels?: string[];
}

const loadSuites = (repoRoot: string): SuiteDefinition[] => {
  const suitesPath = resolve(
    repoRoot,
    'x-pack/platform/packages/shared/kbn-evals/evals.suites.json'
  );
  const raw = readFileSync(suitesPath, 'utf-8') as string;
  const parsed = JSON.parse(raw) as { suites: SuiteDefinition[] };
  return parsed.suites ?? [];
};

export function registerListSuitesRoute({ router, repoRoot }: SuiteRouteDependencies) {
  router.versioned
    .get({
      path: '/internal/evals/suites',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
    })
    .addVersion({ version: '1', validate: {} }, async (_context, _request, response) => {
      try {
        const suites = loadSuites(repoRoot);
        return response.ok({
          body: {
            suites: suites.map(({ id, name, tags, configPath, slackChannel }) => ({
              id,
              name,
              tags,
              config_path: configPath,
              slack_channel: slackChannel,
            })),
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to load suites: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        });
      }
    });
}

export { loadSuites };
