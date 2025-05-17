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

runRecipe(
  {
    name: 'describe_stream',
    flags: {
      string: ['stream'],
      help: `
        --stream      The name of the stream to describe
      `,
      default: {
        stream: 'logs',
      },
    },
  },
  async ({ inferenceClient, kibanaClient, esClient, logger, log, signal, flags }) => {
    const stream = (
      await kibanaClient.fetch<Streams.WiredStream.GetResponse>(`/api/streams/${flags.stream}`)
    ).stream;

    const now = moment();

    const end = now.valueOf();

    const start = now.clone().subtract(1, 'days').valueOf();

    const description = await describeStream({
      definition: stream,
      start,
      end,
      esClient,
      inferenceClient,
      logger,
      signal,
    });

    log.info(description);
  }
);
