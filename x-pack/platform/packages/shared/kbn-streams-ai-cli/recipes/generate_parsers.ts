/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import { generateParsers } from '@kbn/streams-ai';
import moment from 'moment';
import { inspect } from 'util';
import { withInferenceSpan } from '@kbn/inference-tracing';
import { clearStreams } from '../util/clear_streams';
import { enableStreams } from '../util/enable_streams';
import { initializeCliOnboarding } from '../util/initialize_cli_onboarding';
import { prepartitionStreams } from '../util/prepartition_streams';
import { withLoghubSynthtrace } from '../util/with_synthtrace';
import { getStreamNames } from '../util/get_stream_names';

runRecipe(
  {
    name: 'generate_parsers',
    flags: {
      string: ['stream'],
      boolean: ['apply'],
      help: `
        --stream      The name of the stream to generate parsers for
        --apply       Whether to apply the generated parsers
      `,
      default: {
        stream: 'logs',
      },
    },
  },
  async ({ inferenceClient, kibanaClient, esClient, logger, log, signal, flags }) => {
    await clearStreams({
      esClient,
      kibanaClient,
      signal,
    });

    await enableStreams({
      kibanaClient,
      signal,
    });

    const streams = getStreamNames(flags);

    await prepartitionStreams({
      esClient,
      kibanaClient,
      signal,
      filter: streams.map((stream) => stream.split('.')[1]),
    });

    const now = moment();

    const end = now.valueOf();

    const start = now.clone().subtract(1, 'hours').valueOf();

    await withLoghubSynthtrace(
      {
        start,
        end,
        esClient,
        logger,
      },
      async () => {
        await Promise.allSettled(
          streams.map(async (name) => {
            return withInferenceSpan(`generate_parsers ${name}`, async (span) => {
              log.info(`Initializing task context and state for ${name}`);

              const {
                context,
                state: initialState,
                apply,
              } = await initializeCliOnboarding({
                start,
                end,
                name,
                esClient,
                inferenceClient,
                logger,
                signal,
                kibanaClient,
              });

              span?.setAttribute('input.value', JSON.stringify(initialState.stream));

              log.info(`Generating parsers for ${name}`);
              const nextState = await generateParsers({ context, state: initialState });
              log.info(inspect(nextState.stream, { depth: null }));

              if (flags.apply) {
                await apply(nextState);
              }

              span?.setAttribute('output.value', JSON.stringify(nextState.stream));
            }).catch((error) => {
              log.error(inspect(error, { depth: 10 }));
              throw error;
            });
          })
        );
      }
    );
  }
);
