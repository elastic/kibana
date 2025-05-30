/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import { describeStream, generateParsers, generateProcessors } from '@kbn/streams-ai';
import moment from 'moment';
import { inspect } from 'util';
import { clearStreams } from '../util/clear_streams';
import { enableStreams } from '../util/enable_streams';
import { initializeCliOnboarding } from '../util/initialize_cli_onboarding';
import { prepartitionStreams } from '../util/prepartition_streams';
import { withLoghubSynthtrace } from '../util/with_synthtrace';

runRecipe(
  {
    name: 'onboard_stream_flow',
    flags: {
      string: ['stream'],
      help: `
        --stream      The stream to onboard
      `,
      default: {
        stream: 'logs',
      },
    },
  },
  async ({ inferenceClient, kibanaClient, esClient, logger, log, signal, flags }) => {
    const now = moment();

    const end = now.valueOf();

    const start = now.clone().subtract(1, 'hour').valueOf();

    await clearStreams({
      esClient,
      kibanaClient,
      signal,
    });

    await enableStreams({
      kibanaClient,
      signal,
    });

    await prepartitionStreams({
      esClient,
      kibanaClient,
      signal,
    });

    await withLoghubSynthtrace(
      {
        start,
        end,
        esClient,
        logger,
      },
      async () => {
        log.info('Initializing task context and state');

        const { context, state: initialState } = await initializeCliOnboarding({
          start,
          end,
          name: String(flags.stream),
          esClient,
          inferenceClient,
          logger,
          signal,
          kibanaClient,
        });

        log.info('Generating stream description');
        const { stream } = await describeStream({ context, state: initialState })
          .then((state) => {
            log.info('Generating parsers');
            return generateParsers({ context, state });
          })
          .then((state) => {
            log.info('Generating processors');
            return generateProcessors({ context, state });
          });

        log.info(inspect(stream, { depth: null }));
      }
    );
  }
);
