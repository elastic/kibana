/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { evaluate as base } from '@kbn/evals';
import { toolingLogToLogger } from '@kbn/kibana-api-cli';
import { getFlags } from '@kbn/dev-cli-runner';
import type { StreamsSpecificEvaluationWorkerFixtures } from './types';

export const evaluate = base.extend<{}, StreamsSpecificEvaluationWorkerFixtures>({
  logger: [
    async ({ log }, use) => {
      const logger = toolingLogToLogger({
        flags: getFlags(process.argv),
        log,
      });

      await use(logger);
    },
    {
      scope: 'worker',
    },
  ],
});
