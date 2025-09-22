/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import type { Streams } from '@kbn/streams-schema';
import { partitionStream } from '@kbn/streams-ai/workflows/partition_stream';
import moment from 'moment';
import { format } from 'util';
import { clearStreams } from '../util/clear_streams';
import { enableStreams } from '../util/enable_streams';
import { withLoghubSynthtrace } from '../util/with_synthtrace';

runRecipe(
  {
    name: 'partition_stream',
    flags: {
      boolean: ['apply'],
      help: `
        --apply     whether to apply the generated partitions
      `,
    },
  },
  async ({ inferenceClient, kibanaClient, flags, esClient, logger, log, signal }) => {
    await clearStreams({ kibanaClient, esClient, signal });

    await enableStreams({ kibanaClient, signal });

    const rootStream = (
      await kibanaClient.fetch<Streams.WiredStream.GetResponse>(`/api/streams/logs`)
    ).stream;

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
        const partitions = await partitionStream({
          definition: rootStream,
          start,
          end,
          esClient,
          inferenceClient,
          logger,
          signal,
        });

        log.info(format(partitions));

        if (flags.apply) {
          for (const partition of partitions) {
            log.info(`Forking into ${partition.name}`);
            await kibanaClient.fetch(`/api/streams/logs/_fork`, {
              method: 'POST',
              body: {
                stream: {
                  name: `logs.${partition.name}`,
                },
                if: partition.condition,
              },
            });
          }
        }
      }
    );
  }
);
