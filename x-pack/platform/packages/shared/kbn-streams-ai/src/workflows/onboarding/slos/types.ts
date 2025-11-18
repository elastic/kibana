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
import type { NaturalLanguageQuery } from '../queries/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CreateSLOToolCall {}

export interface OnboardSLOsWorkflowInput extends StreamWorkflowInput<Streams.all.Model> {
  analysis: DocumentAnalysis;
  queries: NaturalLanguageQuery[];
}

export interface OnboardSLOsWorkflowChange {
  slos: CreateSLOToolCall[];
}

export type OnboardSLOsWorkflowGenerateResult =
  StreamWorkflowGenerateResult<OnboardSLOsWorkflowChange>;

export type OnboardSLOsWorkflowApplyResult = StreamWorkflowApplyResult<Streams.all.Model>;
