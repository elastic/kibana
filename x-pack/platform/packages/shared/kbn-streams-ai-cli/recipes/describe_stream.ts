/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import { Streams } from '@kbn/streams-schema';
import { describeStream } from '@kbn/streams-ai';
import moment from 'moment';
import { omit } from 'lodash';
import { clearStreams } from '../util/clear_streams';
import { enableStreams } from '../util/enable_streams';
import { prepartitionStreams } from '../util/prepartition_streams';
import { withLoghubSynthtrace } from '../util/with_synthtrace';
import { createStreamsRepositoryCliClient } from '../util/create_repository_client';

runRecipe(
  {
    name: 'describe_stream',
    flags: {
      string: ['stream'],
      boolean: ['apply'],
      help: `
        --stream      The name of the stream to describe
        --apply       Store the updated description
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

    await prepartitionStreams({
      esClient,
      kibanaClient,
      signal,
    });

    const streamsClient = createStreamsRepositoryCliClient(kibanaClient);

    const getResponse = await streamsClient.fetch(`GET /api/streams/{name} 2023-10-31`, {
      signal,
      params: {
        path: {
          name: String(flags.stream),
        },
      },
    });

    Streams.WiredStream.GetResponse.asserts(getResponse);

    const stream = getResponse.stream;

    const now = moment();

    const end = now.valueOf();

    const start = now.clone().subtract(1, 'hour').valueOf();

    await withLoghubSynthtrace(
      {
        start,
        end,
        esClient,
        logger,
      },
      async () => {
        const description = await describeStream({
          definition: stream,
          start,
          end,
          esClient,
          inferenceClient,
          logger,
          signal,
        });

        if (flags.apply) {
          await streamsClient.fetch('PUT /api/streams/{name} 2023-10-31', {
            signal,
            params: {
              path: {
                name: stream.name,
              },
              body: {
                dashboards: getResponse.dashboards,
                queries: getResponse.queries,
                stream: {
                  ...omit(stream, 'name'),
                  description,
                },
              },
            },
          });
        }
      }
    );
  }
);
