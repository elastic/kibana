/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import type { StreamAction } from '../types';

export const describeDatasetAction: StreamAction = {
  id: 'describeDataset',
  label: 'Describe dataset',
  description: 'Analyze the selected stream and summarize its fields and sample documents.',
  run: async ({ esClient, stream, start, end }) => {
    const analysis = await describeDataset({
      esClient,
      index: stream.name,
      start,
      end,
    });

    return {
      label: 'Dataset description',
      description: 'Summary of fields and sample documents.',
      body: formatDocumentAnalysis(analysis),
    };
  },
};
