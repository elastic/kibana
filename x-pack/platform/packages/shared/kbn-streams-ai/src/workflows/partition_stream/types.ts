/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentAnalysis } from '@kbn/ai-tools';
import type { Condition } from '@kbn/streamlang';
import type { Streams } from '@kbn/streams-schema';
import type {
  StreamWorkflowApplyResult,
  StreamWorkflowGenerateResult,
  StreamWorkflowInput,
} from '../types';

export interface PartitionStreamWorkflowInput
  extends StreamWorkflowInput<Streams.WiredStream.Model> {
  analysis: DocumentAnalysis;
}

export interface PartitionStreamWorkflowChange {
  partitions: Array<{ name: string; condition: Condition }>;
}

export type PartitionStreamWorkflowGenerateResult =
  StreamWorkflowGenerateResult<PartitionStreamWorkflowChange>;

export type PartitionStreamWorkflowApplyResult =
  StreamWorkflowApplyResult<Streams.WiredStream.Model>;
