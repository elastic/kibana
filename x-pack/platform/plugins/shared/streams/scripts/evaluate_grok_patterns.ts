/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

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
 * yarn run ts-node --transpile-only x-pack/platform/plugins/shared/streams/scripts/evaluate_grok_patterns.ts
 * ```
 */

import { Client } from '@elastic/elasticsearch';
import fetch from 'node-fetch';
import uniq from 'lodash/uniq';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import yargs from 'yargs/yargs';
import { flattenObject } from '@kbn/object-utils';
import { get } from 'lodash';
import { getLogGroups } from '../server/routes/internal/streams/processing/get_log_groups';

const ES_URL = 'http://localhost:9200';
const ES_USER = 'elastic';
const ES_PASS = 'changeme';
const KIBANA_URL = 'http://localhost:5601/dev';
const MESSAGE_FIELD = 'body.text';

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
    .then((res) => res.hits.hits.map((h: any) => flattenObject(h._source)));
}

async function getStreams(): Promise<string[]> {
  const data = await fetch(`${KIBANA_URL}/api/streams`, {
    method: 'GET',
    headers: getKibanaAuthHeaders(),
  }).then((res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(`HTTP Response Code: ${res.status}`);
  });
  return data.streams.map((s: any) => s.name).filter((name: string) => name.startsWith('logs.'));
}

async function getConnectors(): Promise<string[]> {
  const data = await fetch(`${KIBANA_URL}/api/actions/connectors`, {
    method: 'GET',
    headers: getKibanaAuthHeaders(),
  }).then((res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(`HTTP Response Code: ${res.status}`);
  });
  return data.map((c: any) => c.id);
}

async function getSuggestions(stream: string, connectorId: string, samples: any[]) {
  const data = await fetch(`${KIBANA_URL}/internal/streams/${stream}/processing/_suggestions`, {
    method: 'POST',
    headers: getKibanaAuthHeaders(),
    body: JSON.stringify({
      connectorId,
      field: MESSAGE_FIELD,
      samples,
    }),
  }).then(async (res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(`HTTP Response Code: ${res.status}`);
  });
  return data;
}

async function simulateGrokProcessor(stream: string, documents: any[], grokProcessor: any) {
  const data = await fetch(`${KIBANA_URL}/internal/streams/${stream}/processing/_simulate`, {
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
  }).then((res) => {
    if (res.ok) {
      return res.json();
    }
    throw new Error(`HTTP Response Code: ${res.status}`);
  });
  return data;
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

export async function evaluateGrokSuggestions() {
  const [streams, connectors] = await Promise.all([getStreams(), getConnectors()]);

  if (streams.length === 0) {
    throw new Error('No streams found. Please ensure you have sample data loaded.');
  }

  if (connectors.length === 0) {
    throw new Error(
      'No connectors found. Please ensure you have at least one connector configured.'
    );
  }

  const connector = connectors[connectors.length - 1]; // Use the last connector for evaluation

  // 1. Get AI suggestions
  console.log(chalk.bold('Getting suggestions...'));
  console.log();
  const suggestions = await Promise.all(
    streams.map(async (stream) => {
      const sampleDocs = await fetchDocs(stream, 100);

      const suggestion = await getSuggestions(stream, connector, sampleDocs);
      const grokProcessor = suggestion[0]?.grokProcessor;
      if (!grokProcessor) {
        throw new Error('No grokProcessor returned');
      }
      console.log(`- ${stream}: ${chalk.dim(grokProcessor.patterns.join(', '))}`);

      return { stream, ...grokProcessor };
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

export async function evaluateLogGrouping() {
  const allDocs = await fetchDocs('logs.*', 10_000);
  const groups = getLogGroups(
    allDocs.map((doc) => `${get(doc, MESSAGE_FIELD)}|||${get(doc, 'attributes.filepath')}`),
    1
  );
  const output = groups.map((g) => {
    return {
      pattern: g.pattern,
      logs: g.logs.length,
      streams: uniq(g.logs.map((log) => log.split('|||')[1])),
    };
  });
  output.forEach((g) => {
    console.log();
    console.log(chalk.bold(`"${g.pattern}" (${g.logs} logs):`));
    g.streams.forEach((stream) => {
      console.log(`- ${chalk.green(stream)}`);
    });
  });
  return output;
}

async function runGrokSuggestionsEvaluation() {
  await evaluateGrokSuggestions()
    .then((result) => {
      const file = `suggestion_results.${Date.now()}.json`;
      console.log();
      console.log(`Evaluation complete. Writing results to ${chalk.underline.dim(file)}`);
      console.log();
      return writeFile(join(__dirname, file), JSON.stringify(result, null, 2));
    })
    .catch(console.error);
}

async function runLogGroupingEvaluation() {
  console.log();
  console.log('Starting evaluation of Log Grouping...');
  await evaluateLogGrouping()
    .then((result) => {
      const file = `grouping_results.${Date.now()}.json`;
      console.log();
      console.log(`Evaluation complete. Writing results to ${file}`);
      return writeFile(join(__dirname, file), JSON.stringify(result, null, 2));
    })
    .catch(console.error);
}

yargs(process.argv.slice(2))
  .command('*', 'Evaluate AI suggestions for Grok patterns', runGrokSuggestionsEvaluation)
  .command('grouping', 'Evaluate log grouping patterns', runLogGroupingEvaluation)
  .parse();
