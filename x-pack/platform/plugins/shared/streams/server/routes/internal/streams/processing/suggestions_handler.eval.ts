/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Add LogsHub sample data using:
 *
 * ```bash
 * node scripts/synthtrace.js sample_logs --live --liveBucketSize=1000
 * ```
 *
 * Run evaluation script using:
 *
 * ```bash
 * yarn run ts-node --transpile-only x-pack/platform/plugins/shared/streams/server/routes/internal/streams/processing/suggestions_handler.eval.ts
 * ```
 */

import { Client } from '@elastic/elasticsearch';
import fetch from 'node-fetch';
import uniq from 'lodash/uniq';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { getLogGroups } from './get_log_groups';

const ES_URL = 'http://localhost:9200';
const ES_USER = 'elastic';
const ES_PASS = 'changeme';
const KIBANA_URL = 'http://localhost:5601/dev';

const esClient = new Client({
  node: ES_URL,
  auth: {
    username: ES_USER,
    password: ES_PASS,
  },
});

function getKibanaAuthHeaders() {
  const basic = Buffer.from(`${ES_USER}:${ES_PASS}`).toString('base64');
  return {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/json',
    'kbn-xsrf': 'true',
    'x-elastic-internal-origin': 'Kibana',
  };
}

async function fetchDocs(index: string | string[], size = 100) {
  return await esClient
    .search({
      index,
      size,
      sort: '@timestamp:desc',
      query: { match_all: {} },
      _source: true,
    })
    .then((res) => res.hits.hits.map((h: any) => h._source));
}

async function getStreams(): Promise<string[]> {
  const res = await fetch(`${KIBANA_URL}/api/streams`, {
    method: 'GET',
    headers: getKibanaAuthHeaders(),
  });
  const data = await res.json();
  return data.streams.map((s: any) => s.name).filter((name: string) => name.startsWith('logs.'));
}

async function getSuggestions(stream: string, connectorId: string, samples: any[]) {
  const res = await fetch(`${KIBANA_URL}/internal/streams/${stream}/processing/_suggestions`, {
    method: 'POST',
    headers: getKibanaAuthHeaders(),
    body: JSON.stringify({
      connectorId,
      field: 'message',
      samples,
    }),
  });
  return res.json();
}

async function simulateGrokProcessor(stream: string, documents: any[], grokProcessor: any) {
  const res = await fetch(`${KIBANA_URL}/internal/streams/${stream}/processing/_simulate`, {
    method: 'POST',
    headers: getKibanaAuthHeaders(),
    body: JSON.stringify({
      documents,
      processing: [
        {
          id: 'eval-grok',
          grok: {
            field: grokProcessor.field,
            patterns: grokProcessor.patterns,
            pattern_definitions: grokProcessor.pattern_definitions,
            ignore_failure: true,
            ignore_missing: true,
            if: { always: {} },
          },
        },
      ],
    }),
  });
  return res.json();
}

async function getParsingScore(
  stream: string,
  documents: any[],
  grokProcessor: any,
  batchSize = 1_000
) {
  let parsedDocs = 0;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const simResult = await simulateGrokProcessor(stream, batch, grokProcessor);
    simResult.documents.forEach((doc: any) => {
      if (doc.status === 'parsed') {
        parsedDocs++;
      }
    });
  }
  return parsedDocs / documents.length;
}

export async function evaluateSuggestions() {
  const streams = await getStreams();

  // 1. Get AI suggestions
  console.log(chalk.bold('Getting suggestions...'));
  console.log();
  const suggestions = await Promise.all(
    streams.map(async (stream) => {
      const sampleDocs = await fetchDocs(stream, 100);

      const suggestion = await getSuggestions(stream, 'azure-gpt4o', sampleDocs);
      const grokProcessor = suggestion[0]?.grokProcessor;
      if (!grokProcessor) {
        throw new Error('No grokProcessor returned');
      }
      console.log(`- ${stream}: ${chalk.dim(grokProcessor.patterns.join(', '))}`);

      return {
        stream,
        ...grokProcessor,
      };
    })
  );

  // 2. Simulate suggested processors in batches and calculate parsing scores
  console.log();
  console.log(chalk.bold('Simulate processing...'));
  console.log();

  const output = await Promise.all(
    suggestions.map(async (suggestion) => {
      const sampleDocs = await fetchDocs(suggestion.stream, 100);
      const allDocs = await fetchDocs(suggestion.stream, 10_000);

      const parsingScore = await getParsingScore(suggestion.stream, sampleDocs, suggestion);
      const allDocsParsingScore = await getParsingScore(suggestion.stream, allDocs, suggestion);
      console.log(`- ${suggestion.stream}: ${chalk.green(allDocsParsingScore)}`);

      return {
        ...suggestion,
        parsing_score_samples: parsingScore,
        parsing_score_all_docs: allDocsParsingScore,
      };
    })
  );

  // 3. Calculate average parsing scores
  const averageParsingScoreSamples =
    Object.values(output).reduce((sum, suggestion) => {
      return sum + suggestion.parsing_score_samples;
    }, 0) / Object.values(output).length;

  const averageParsingScoreAllDocs =
    Object.values(output).reduce((sum, suggestion) => {
      return sum + suggestion.parsing_score_all_docs;
    }, 0) / Object.values(output).length;

  console.log();
  console.log(
    chalk.bold(`Average Parsing Score (samples): ${chalk.green(averageParsingScoreSamples)}`)
  );
  console.log(
    chalk.bold(`Average Parsing Score (all docs): ${chalk.green(averageParsingScoreAllDocs)}`)
  );

  return output.reduce((acc, suggestion) => {
    acc[suggestion.stream] = {
      patterns: suggestion.patterns,
      pattern_definitions: suggestion.pattern_definitions,
      parsing_score_samples: suggestion.parsing_score_samples,
      parsing_score_all_docs: suggestion.parsing_score_all_docs,
    };
    return acc;
  }, {});
}

evaluateSuggestions()
  .then((result) => {
    const file = `suggestion_results.${Date.now()}.json`;
    console.log();
    console.log(`Evaluation complete. Writing results to ${chalk.underline.dim(file)}`);
    console.log();
    return writeFile(join(__dirname, file), JSON.stringify(result, null, 2));
  })
  .catch(console.error);

// export async function evaluateLogGrouping() {
//   const allDocs = await fetchDocs('logs*', 10_000);
//   const groups = getLogGroups(
//     allDocs.map((doc) => `${doc.message}|||${doc.filepath}`),
//     1
//   );
//   return groups.map((g) => {
//     return {
//       pattern: g.pattern,
//       logs: g.logs.length,
//       streams: uniq(g.logs.map((log) => log.split('|||')[1])),
//     };
//   });
// }

// console.log();
// console.log('Starting evaluation of Log Grouping...');
// evaluateLogGrouping()
//   .then((result) => {
//     const file = `grouping_results.${Date.now()}.json`;
//     console.log();
//     console.log(`Evaluation complete. Writing results to ${file}`);
//     return writeFile(join(__dirname, file), JSON.stringify(result, null, 2));
//   })
//   .catch(console.error);
