/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLogPatterns } from '@kbn/ai-tools';
import { LOG_PATTERNS_FEATURE_TYPE } from '@kbn/streams-schema';
import { createTracedEsClient } from '@kbn/traced-es-client';
import type { ComputedFeatureGenerator } from './types';

const LOG_MESSAGE_FIELDS = ['message', 'body.text'];

const RARE_PATTERN_COUNT_THRESHOLD = 50;
const MAX_COMMON_PATTERNS = 3;
const MAX_RARE_PATTERNS = 2;
const MAX_PATTERNS = MAX_COMMON_PATTERNS + MAX_RARE_PATTERNS;

export const logPatternsGenerator: ComputedFeatureGenerator = {
  type: LOG_PATTERNS_FEATURE_TYPE,

  description: 'Log message patterns identified through categorization analysis',

  llmInstructions: `Contains log message patterns identified by analyzing the log messages in the stream.
Use the \`properties.patterns\` array to see common log patterns, their frequency, and sample messages.
Each pattern includes: field (source field name), pattern (with placeholders), regex, count (frequency), and sample (example message).
This is useful for understanding the types of logs in the stream and identifying anomalies or trends.`,

  generate: async ({ stream, start, end, esClient, logger }) => {
    const tracedClient = createTracedEsClient({
      client: esClient,
      logger,
      plugin: 'streams',
    });

    const patterns = await getLogPatterns({
      esClient: tracedClient,
      index: stream.name,
      start,
      end,
      fields: LOG_MESSAGE_FIELDS,
    });

    const commonPatterns = patterns.filter((p) => p.count >= RARE_PATTERN_COUNT_THRESHOLD);
    const rarePatterns = patterns.filter((p) => p.count < RARE_PATTERN_COUNT_THRESHOLD);

    const selectedCommon = commonPatterns.slice(0, MAX_COMMON_PATTERNS);
    const remainingBudget = MAX_PATTERNS - selectedCommon.length;
    const selectedRare = rarePatterns.slice(0, remainingBudget);

    const selectedPatterns = [...selectedCommon, ...selectedRare];

    return {
      patterns: selectedPatterns.map(({ field, pattern, regex, count, sample }) => ({
        pattern,
        regex,
        count,
        sample,
        field,
      })),
    };
  },
};
