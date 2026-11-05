/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { errorDetails } from '../../errors';
import type { RunInvalidateOpts } from './run_invalidate';
import { runInvalidate } from './run_invalidate';
import type { ApiKeyInvalidationTaskState } from './state_schema';
import {
  apiKeyInvalidationTaskStateSchemaByVersion,
  emptyApiKeyInvalidationTaskState,
} from './state_schema';

type RunDependencies = Omit<
  RunInvalidateOpts,
  'logger' | 'missingApiKeyRetries' | 'pluginTag' | 'removalDelay'
>;

export interface InvalidationRunnerOptions {
  logger: Logger;
  /** Added to UIAM log tags, e.g. `alerting`. */
  pluginTag: string;
  removalDelay: string;
  /** Returns the clients and saved object types for one run. Called at the start of every run. */
  getRunDependencies: () => Promise<RunDependencies> | RunDependencies;
  /** Replaces the default error log when a run fails. */
  onError?: (error: unknown) => void;
}

export interface InvalidationRunner {
  /** Runs one invalidation pass. Never throws; failures are logged and the state still advances. */
  run(state: Partial<ApiKeyInvalidationTaskState>): Promise<ApiKeyInvalidationTaskState>;
  stateSchemaByVersion: typeof apiKeyInvalidationTaskStateSchemaByVersion;
  emptyState: ApiKeyInvalidationTaskState;
}

/** The run logic of a plugin's API key invalidation task. Each plugin registers its own task. */
export const createInvalidationRunner = ({
  logger,
  pluginTag,
  removalDelay,
  getRunDependencies,
  onError,
}: InvalidationRunnerOptions): InvalidationRunner => ({
  stateSchemaByVersion: apiKeyInvalidationTaskStateSchemaByVersion,
  emptyState: emptyApiKeyInvalidationTaskState,
  async run(state) {
    let totalInvalidated = 0;
    let missingApiKeyRetries = { ...(state.missing_api_key_retries ?? {}) };
    try {
      const result = await runInvalidate({
        ...(await getRunDependencies()),
        logger,
        missingApiKeyRetries,
        pluginTag,
        removalDelay,
      });
      totalInvalidated = result.totalInvalidated;
      missingApiKeyRetries = result.missingApiKeyRetries;
      logger.debug(`Invalidated a total of ${totalInvalidated} API keys.`);
    } catch (err) {
      if (onError) {
        onError(err);
      } else {
        const { message, stack } = errorDetails(err);
        logger.error(`Error invalidating ${pluginTag} API keys: ${message}`, {
          error: { stack_trace: stack },
        });
      }
    }
    return {
      runs: (state.runs ?? 0) + 1,
      total_invalidated: totalInvalidated,
      missing_api_key_retries: missingApiKeyRetries,
    };
  },
});
