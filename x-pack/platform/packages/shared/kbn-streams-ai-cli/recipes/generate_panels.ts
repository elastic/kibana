/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import { Streams } from '@kbn/streams-schema';
import moment from 'moment';
import { format } from 'util';
import { generateMappings, generatePanels } from '@kbn/streams-ai';

runRecipe(
  {
    name: 'generate_panels',
    flags: {
      string: ['stream'],
      help: `
        --stream      The name of the stream to generate panels for
      `,
      default: {
        stream: 'logs',
      },
    },
  },
  async ({ inferenceClient, kibanaClient, flags, esClient, logger, log, signal }) => {
    const definition = (
      await kibanaClient.fetch<Streams.WiredStream.GetResponse>(`/api/streams/${flags.stream}`)
    ).stream;

    const now = moment();

    const end = now.valueOf();

    const start = now.clone().subtract(1, 'days').valueOf();

    const panels = await generatePanels({
      definition,
      end,
      esClient,
      inferenceClient,
      logger,
      signal,
      start,
    });

    const fields = await generateMappings({
      definition,
      end,
      esClient,
      inferenceClient,
      logger,
      signal,
      start,
      suggestedQueries: panels.map((panel) => panel.query),
    });

    const queries = await generateQueries({
      definition,
      end,
      esClient,
      inferenceClient,
      logger,
      signal,
      start,
      panels,
    });

    log.info(
      format({
        panels,
        fields,
      })
    );
  }
);
