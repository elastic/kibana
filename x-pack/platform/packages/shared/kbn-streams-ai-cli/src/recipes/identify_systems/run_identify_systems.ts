/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import { identifySystems } from '@kbn/streams-ai';
import moment from 'moment';
import { createStreamsRepositoryCliClient } from '../../util/create_repository_client';
import { withLoghubSynthtrace } from '../../util/with_synthtrace';

runRecipe(
  {
    name: 'identify_systems',
    flags: {
      string: ['stream'],
      boolean: ['apply'],
      help: `
        --stream      The name of the stream for which systems should be identified
        --apply       Store the identified systems
      `,
      default: {
        stream: 'logs',
      },
    },
  },
  async ({ inferenceClient, kibanaClient, esClient, logger, log, signal, flags }) => {
    const streamsClient = createStreamsRepositoryCliClient(kibanaClient);

    const getResponse = await streamsClient.fetch(`GET /api/streams/{name} 2023-10-31`, {
      signal,
      params: {
        path: {
          name: String(flags.stream),
        },
      },
    });

    const stream = getResponse.stream;

    const now = moment();

    const start = now.clone().subtract(1, 'hour').valueOf();
    const end = now.valueOf();

    await withLoghubSynthtrace({ start, end, esClient, logger }, async () => {
      const { systems } = await identifySystems({
        stream,
        start,
        end,
        esClient,
        inferenceClient,
        logger,
      });

      log.info(systems);
    });
  }
);
