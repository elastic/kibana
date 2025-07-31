/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ToolCall } from '@kbn/inference-common';
import moment from 'moment';
import { describeDataset } from '../describe_dataset';
import { sortAndTruncateAnalyzedFields } from '../describe_dataset/sort_and_truncate_analyzed_fields';
import { TruncatedDocumentAnalysis } from '../describe_dataset/document_analysis';

type DescribeDatasetToolCall = ToolCall<string, { index: string; kql?: string }>;

export interface DescribeDatasetToolCallResponse {
  analysis: TruncatedDocumentAnalysis;
}

export function createDescribeDatasetToolCallback({
  esClient,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  start?: number;
  end?: number;
}) {
  return async ({
    function: {
      arguments: { index, kql },
    },
  }: DescribeDatasetToolCall): Promise<DescribeDatasetToolCallResponse> => {
    const analysis = await describeDataset({
      esClient,
      index,
      kql,
      start: start ?? moment().subtract(24, 'hours').valueOf(),
      end: end ?? Date.now(),
    });

    return {
      analysis: sortAndTruncateAnalyzedFields(analysis),
    };
  };
}
