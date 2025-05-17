/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import { generateParsers } from '@kbn/streams-ai';
import { Streams } from '@kbn/streams-schema';
import { callGenerateProcessors } from '../util/call_generate_processors';

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
    const streamGetResponse = await kibanaClient.fetch<Streams.WiredStream.GetResponse>(
      `/api/streams/${flags.stream}`
    );

    await callGenerateProcessors(
      {
        esClient,
        flags,
        inferenceClient,
        kibanaClient,
        log,
        logger,
        signal,
        streamGetResponse,
      },
      generateParsers
    );
  }
);
