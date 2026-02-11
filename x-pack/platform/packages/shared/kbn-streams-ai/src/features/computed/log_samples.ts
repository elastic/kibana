/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSampleDocuments } from '@kbn/ai-tools';
import { LOG_SAMPLES_FEATURE_TYPE } from '@kbn/streams-schema';
import type { ComputedFeatureGenerator } from './types';

const SAMPLE_SIZE = 5;

export const logSamplesGenerator: ComputedFeatureGenerator = {
  type: LOG_SAMPLES_FEATURE_TYPE,

  description: 'Raw sample log documents from the stream',

  llmInstructions: `Contains raw sample log documents from the stream.
Use the \`properties.samples\` array to see actual log entries and their field values.
This is useful for understanding the format of logs, identifying patterns, and seeing real examples of data in the stream.`,

  generate: async ({ stream, start, end, esClient }) => {
    const { hits } = await getSampleDocuments({
      esClient,
      index: stream.name,
      start,
      end,
      size: SAMPLE_SIZE,
    });

    const samples = hits.map((hit) => hit.fields ?? {});

    return {
      samples,
    };
  },
};
