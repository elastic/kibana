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
 * node --require ./src/setup_node_env/ ./x-pack/platform/plugins/shared/streams/scripts/evaluate_heuristic_grok_patterns.ts
 * ```
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import yargs from 'yargs/yargs';
import {
  getReviewFields,
  getGrokProcessor,
  getGrokPattern,
  extractGrokPatternDangerouslySlow,
} from '@kbn/grok-heuristics';
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
  analyzeExtractedFields,
} from './evaluation_helpers';

async function getSuggestions(
  stream: string,
  connectorId: string,
  messages: string[],
  reviewFields: ReturnType<typeof getReviewFields>
) {
  const response = await fetch(
    `${KIBANA_URL}/internal/streams/${stream}/processing/_suggestions/grok`,
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

  const connector = connectors[0]; // Use the first connector for evaluation

  // 1. Get AI suggestions
  console.log(chalk.bold('Getting suggestions...'));
  console.log();
  const suggestions = await Promise.all(
    streams.map(async (stream) => {
      const sampleDocs = await fetchDocs(stream, 100);
      const messages = extractMessages(sampleDocs, MESSAGE_FIELD);

      const grokPatternNodes = extractGrokPatternDangerouslySlow(messages);
      const grokPattern = getGrokPattern(grokPatternNodes);
      const reviewFields = getReviewFields(grokPatternNodes, 10);
      console.log(`- ${stream}: ${chalk.dim(grokPattern)}`);

      const suggestionData = await getSuggestions(stream, connector, messages, reviewFields);
      const grokProcessor = getGrokProcessor(grokPatternNodes, suggestionData.grokProcessor);
      if (!grokProcessor) {
        throw new Error('No grokProcessor returned');
      }
      console.log(`- ${stream}: ${chalk.green(grokProcessor.patterns.join(', '))}`);

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

      const steps = [
        {
          action: 'grok',
          customIdentifier: 'eval-grok',
          from: MESSAGE_FIELD,
          patterns: suggestion.patterns,
          pattern_definitions: suggestion.pattern_definitions,
        },
      ];

      const parsingScore = await getParsingScore(suggestion.stream, sampleDocs, steps);
      const allDocsParsingScore = await getParsingScore(suggestion.stream, allDocs, steps);
      const fieldAnalysis = await analyzeExtractedFields(suggestion.stream, sampleDocs, steps);

      console.log(`- ${suggestion.stream}: ${chalk.green(allDocsParsingScore)}`);
      Object.entries(fieldAnalysis).forEach(([field, info]) => {
        console.log(
          `  ${chalk.dim('→')} ${field}: ${chalk.cyan(info.uniqueCount)} unique values ${chalk.dim(
            '(e.g., ' + info.samples.map((s) => `"${s}"`).join(', ') + ')'
          )}`
        );
      });

      return {
        ...suggestion,
        parsing_score_samples: parsingScore,
        parsing_score_all_docs: allDocsParsingScore,
        field_analysis: fieldAnalysis,
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
      patterns: suggestion.patterns,
      pattern_definitions: suggestion.pattern_definitions,
      parsing_score_samples: suggestion.parsing_score_samples,
      parsing_score_all_docs: suggestion.parsing_score_all_docs,
      field_analysis: suggestion.field_analysis,
    };
    return acc;
  }, {});
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

yargs(process.argv.slice(2))
  .command('*', 'Evaluate AI suggestions for Grok patterns', runGrokSuggestionsEvaluation)
  .parse();
