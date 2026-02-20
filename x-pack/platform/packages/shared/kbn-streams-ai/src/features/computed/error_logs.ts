/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { getSampleDocuments } from '@kbn/ai-tools';
import { ERROR_LOGS_FEATURE_TYPE } from '@kbn/streams-schema';
import type { ComputedFeatureGenerator } from './types';

const SAMPLE_SIZE = 5;
const LOG_MESSAGE_FIELDS = ['message', 'body.text'];
const ERROR_KEYWORDS = ['error', 'exception'];

const ERROR_FILTER: QueryDslQueryContainer = {
  bool: {
    should: [
      { term: { 'log.level': 'error' } },
      ...LOG_MESSAGE_FIELDS.flatMap((field) =>
        ERROR_KEYWORDS.map((keyword) => ({ match_phrase: { [field]: keyword } }))
      ),
    ],
    minimum_should_match: 1,
  },
};

export const errorLogsGenerator: ComputedFeatureGenerator = {
  type: ERROR_LOGS_FEATURE_TYPE,

  description: 'Sample error logs extracted from the stream',

  llmInstructions: `Contains sample error logs from the stream, filtered by log.level: error or messages containing error/exception keywords.
Use the \`properties.samples\` array to see actual error log entries.
This is useful for understanding error patterns, identifying recurring issues, and diagnosing problems in the system.`,

  generate: async ({ stream, start, end, esClient }) => {
    const { hits } = await getSampleDocuments({
      esClient,
      index: stream.name,
      start,
      end,
      size: SAMPLE_SIZE,
      filter: ERROR_FILTER,
    });

    return {
      samples: hits.map((hit) => hit.fields ?? {}),
    };
  },
};
