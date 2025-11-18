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

export interface OnboardFieldDefinitionsWorkflowInput
  extends StreamWorkflowInput<Streams.ingest.all.Model> {
  analysis: DocumentAnalysis;
}

export interface OnboardFieldDefinitionsWorkflowChange {
  field_definitions: {};
}

export type OnboardFieldDefinitionsWorkflowGenerateResult =
  StreamWorkflowGenerateResult<OnboardFieldDefinitionsWorkflowChange>;

export type OnboardFieldDefinitionsWorkflowApplyResult =
  StreamWorkflowApplyResult<Streams.ingest.all.Model>;
