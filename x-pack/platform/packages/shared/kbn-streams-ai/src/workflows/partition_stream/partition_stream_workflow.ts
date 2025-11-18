/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { partitionStream } from './partition_streams';
import type { StreamWorkflow } from '../types';
import type {
  PartitionStreamWorkflowInput,
  PartitionStreamWorkflowApplyResult,
  PartitionStreamWorkflowGenerateResult,
} from './types';

export const partitionStreamWorkflow: StreamWorkflow<
  Streams.WiredStream.Model,
  PartitionStreamWorkflowInput,
  PartitionStreamWorkflowGenerateResult,
  PartitionStreamWorkflowApplyResult
> = {
  async generate(context, input) {
    const response = await partitionStream({
      definition: input.stream.definition,
      start: context.start,
      end: context.end,
      esClient: context.esClient,
      inferenceClient: context.inferenceClient,
      logger: context.logger,
      signal: context.signal,
    });

    return {
      change: {
        partitions: response,
      },
    };
  },
  async apply(context, input, change) {
    return {
      status: 'success',
      stream: input.stream,
    };
  },
};
