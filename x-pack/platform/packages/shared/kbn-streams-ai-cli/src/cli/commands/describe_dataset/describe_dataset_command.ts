/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Command } from '@kbn/dev-cli-runner';
import { parse } from '@kbn/datemath';
import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import { createKibanaClient } from '@kbn/kibana-api-cli';
import { castArray } from 'lodash';

export const describeDatasetCommand: Command<void> = {
  name: 'describe-dataset',
  description: 'Return a dataset analysis based on a set of sampled documents',
  flags: {
    string: ['index', 'kql', 'from', 'to'],
    boolean: ['include-empty'],
    default: {
      from: 'now-24h',
      to: 'now',
      ['include-empty']: false,
    },
    help: `
    --index           (required)  Index to query for sampled documents
    --kql             (optional)  KQL string to use as a filter for the sampled documents
    --from            (optional)  Start of the time range to query, in datemath or ISO
    --to              (optional)  End of the time range to query, in datemath or ISO
    --include-empty   (optional)  Include empty fields
    `,
  },
  run: async ({ flagsReader, log, addCleanupTask }) => {
    const index = castArray(flagsReader.string('index') ?? flagsReader.getPositionals());

    if (index.length === 0) {
      throw new Error(`No index was specified`);
    }

    const kql = flagsReader.string('kql');
    const from = parse(flagsReader.requiredString('from'))!;
    const to = parse(flagsReader.requiredString('to'))!;

    const includeEmpty = flagsReader.boolean('include-empty');

    const controller = new AbortController();

    addCleanupTask(() => {
      controller.abort();
    });

    const kibanaClient = await createKibanaClient({ log, signal: controller.signal });

    log.info(`Describing dataset for ${index}`);

    const analysis = await describeDataset({
      start: from.valueOf(),
      end: to.valueOf(),
      index,
      kql,
      esClient: kibanaClient.es,
    });

    log.info(`
      ${JSON.stringify(formatDocumentAnalysis(analysis, { dropEmpty: !includeEmpty }))}  
    `);
  },
};
