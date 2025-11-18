/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentAnalysis } from '@kbn/ai-tools';
import type { Streams } from '@kbn/streams-schema';
import type {
  StreamWorkflowApplyResult,
  StreamWorkflowGenerateResult,
  StreamWorkflowInput,
} from '../../types';

export interface NaturalLanguageQuery {
  title: string;
  description: string;
}

export interface GenerateQueriesWorkflowInput extends StreamWorkflowInput<Streams.all.Model> {
  analysis: DocumentAnalysis;
}

export interface GenerateQueriesWorkflowChange {
  queries: NaturalLanguageQuery[];
}

export type GenerateQueriesWorkflowGenerateResult =
  StreamWorkflowGenerateResult<GenerateQueriesWorkflowChange>;

export type GenerateQueriesWorkflowApplyResult = StreamWorkflowApplyResult<Streams.all.Model>;
