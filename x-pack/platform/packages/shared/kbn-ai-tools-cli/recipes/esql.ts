/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { runRecipe } from '@kbn/inference-cli';
import { executeAsEsqlAgent } from '@kbn/ai-tools';
import moment from 'moment';
import { inspect } from 'util';

runRecipe(
  {
    name: 'answer_esql',
    flags: {
      string: ['prompt'],
      help: `
        --prompt      The user prompt for generating ES|QL
      `,
    },
  },
  async ({ inferenceClient, kibanaClient, flags, esClient, logger, log, signal }) => {
    const now = moment();

    const end = now.valueOf();

    const start = now.clone().subtract(1, 'days').valueOf();

    const response = await executeAsEsqlAgent({
      start,
      end,
      esClient,
      inferenceClient,
      logger,
      prompt: String(flags.prompt),
      signal,
    });

    log.info(inspect(response, { depth: null }));
  }
);
