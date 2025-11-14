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
 * node --require ./src/setup_node_env/ ./x-pack/platform/packages/shared/kbn-evals-suite-streams/scripts/evaluate_heuristic_dissect_patterns.ts
 * ```
 */

import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import yargs from 'yargs/yargs';
import {
  getReviewFields,
  getDissectProcessorWithReview,
  extractDissectPatternDangerouslySlow,
} from '@kbn/dissect-heuristics';
import {
  KIBANA_URL,
  MESSAGE_FIELD,
  getKibanaAuthHeaders,
  parseSSEStream,
  fetchDocs,
  getStreams,
  getConnectors,
  extractMessages,
  getParsingScore,
} from './evaluation_helpers';

async function getSuggestions(
  stream: string,
  connectorId: string,
  messages: string[],
  reviewFields: ReturnType<typeof getReviewFields>
) {
  const response = await fetch(
    `${KIBANA_URL}/internal/streams/${stream}/processing/_suggestions/dissect`,
    {
      method: 'POST',
      headers: getKibanaAuthHeaders(),
      body: JSON.stringify({
        connector_id: connectorId,
        sample_messages: messages.slice(0, 10),
        review_fields: reviewFields,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP Response (${response.status}): ${await response.text()}`);
  }

  // Parse SSE stream
  const data = await parseSSEStream(response);
  return data;
}

export async function evaluateDissectSuggestions() {
  const [streams, connectors] = await Promise.all([getStreams(), getConnectors()]);

  if (streams.length === 0) {
    throw new Error('No streams found. Please ensure you have sample data loaded.');
  }

  if (connectors.length === 0) {
    throw new Error(
      'No connectors found. Please ensure you have at least one connector configured.'
    );
  }

  const connector = connectors[0]; // Use the first connector for evaluation

  // 1. Get AI suggestions
  console.log(chalk.bold('Getting suggestions...'));
  console.log();
  const suggestions = await Promise.all(
    streams.map(async (stream) => {
      const sampleDocs = await fetchDocs(stream, 100);
      const messages = extractMessages(sampleDocs, MESSAGE_FIELD);

      const dissectPattern = extractDissectPatternDangerouslySlow(messages);
      const reviewFields = getReviewFields(dissectPattern, 10);
      console.log(`- ${stream}: ${chalk.dim(dissectPattern.pattern)}`);

      const suggestionData = await getSuggestions(stream, connector, messages, reviewFields);
      const dissectProcessor = getDissectProcessorWithReview(
        dissectPattern,
        suggestionData.dissectProcessor,
        MESSAGE_FIELD
      );
      if (!dissectProcessor) {
        throw new Error('No dissectProcessor returned');
      }
      console.log(`- ${stream}: ${chalk.green(dissectProcessor.pattern)}`);

      return { stream, ...dissectProcessor };
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

      const steps = [
        {
          action: 'dissect',
          customIdentifier: 'eval-dissect',
          from: MESSAGE_FIELD,
          pattern: suggestion.pattern,
        },
      ];

      const parsingScore = await getParsingScore(suggestion.stream, sampleDocs, steps);
      const allDocsParsingScore = await getParsingScore(suggestion.stream, allDocs, steps);
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

  return output.reduce<Record<string, any>>((acc, suggestion) => {
    acc[suggestion.stream] = {
      pattern: suggestion.pattern,
      parsing_score_samples: suggestion.parsing_score_samples,
      parsing_score_all_docs: suggestion.parsing_score_all_docs,
    };
    return acc;
  }, {});
}

async function runDissectSuggestionsEvaluation() {
  await evaluateDissectSuggestions()
    .then((result) => {
      const file = `dissect_suggestion_results.${Date.now()}.json`;
      console.log();
      console.log(`Evaluation complete. Writing results to ${chalk.underline.dim(file)}`);
      console.log();
      return writeFile(join(__dirname, file), JSON.stringify(result, null, 2));
    })
    .catch(console.error);
}

yargs(process.argv.slice(2))
  .command('*', 'Evaluate AI suggestions for Dissect patterns', runDissectSuggestionsEvaluation)
  .parse();
