/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { FlagOptions, Flags, mergeFlagOptions, run } from '@kbn/dev-cli-runner';
import { withActiveInferenceSpan } from '@kbn/inference-tracing';
import { createKibanaClient, KibanaClient, toolingLogToLogger } from '@kbn/kibana-api-cli';
import { LogLevelId } from '@kbn/logging';
import { setDiagLogger } from '@kbn/telemetry';
import { ToolingLog } from '@kbn/tooling-log';
import { InferenceCliClient } from './client';
import { createInferenceClient } from './create_inference_client';

type RunRecipeCallback = (options: {
  inferenceClient: InferenceCliClient;
  kibanaClient: KibanaClient;
  esClient: ElasticsearchClient;
  log: ToolingLog;
  logger: Logger;
  signal: AbortSignal;
  flags: Flags;
}) => Promise<void>;

export interface RunRecipeOptions {
  name: string;
  flags?: FlagOptions;
}

export const createRunRecipe =
  (shutdown?: () => Promise<void>) =>
  (
    ...args:
      | [RunRecipeCallback]
      | [string, RunRecipeCallback]
      | [RunRecipeOptions, RunRecipeCallback]
  ) => {
    const callback = args.length === 1 ? args[0] : args[1];
    const options = args.length === 1 ? undefined : args[0];

    const name = typeof options === 'string' ? options : options?.name;
    const flagOptions = typeof options === 'string' ? undefined : options?.flags;

    const nextFlagOptions = mergeFlagOptions(
      {
        string: ['connectorId'],
        help: `
          --connectorId      Use a specific connector id
        `,
      },
      flagOptions
    );

    run(
      async ({ log, addCleanupTask, flags }) => {
        const controller = new AbortController();
        const signal = controller.signal;

        addCleanupTask(() => {
          controller.abort();
        });

        const logger = toolingLogToLogger({ log, flags });
        let logLevel: LogLevelId = 'info';

        if (flags.debug) {
          logLevel = 'debug';
        } else if (flags.verbose) {
          logLevel = 'trace';
        } else if (flags.silent) {
          logLevel = 'off';
        }

        setDiagLogger(logger, logLevel);

        const kibanaClient = await createKibanaClient({ log, signal });

        const esClient = kibanaClient.es;

        const inferenceClient = await createInferenceClient({
          log,
          signal,
          kibanaClient,
          connectorId: flags.connectorId as string | undefined,
        });

        return await withActiveInferenceSpan(`RunRecipe${name ? `: ${name}` : ''}`, () =>
          callback({
            inferenceClient,
            kibanaClient,
            esClient,
            log,
            signal,
            logger,
            flags,
          })
        )
          .finally(async () => {
            await shutdown?.();
          })
          .catch((error) => {
            logger.error(error);
          });
      },
      {
        flags: nextFlagOptions,
      }
    );
  };
