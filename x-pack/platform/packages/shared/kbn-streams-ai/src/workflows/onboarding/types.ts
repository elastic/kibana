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
} from '../types';
import type { OnboardAnomalyDetectionWorkflowChange } from './anomaly_detection/types';
import type { OnboardDashboardsWorkflowChange } from './dashboards/types';
import type { OnboardFieldDefinitionsWorkflowChange } from './field_definitions/types';
import type { OnboardProcessingWorkflowChange } from './processing/types';
import type { OnboardRulesWorkflowChange } from './rules/types';

export interface OnboardStreamWorkflowInput extends StreamWorkflowInput<Streams.WiredStream.Model> {
  analysis: DocumentAnalysis;
}

export interface OnboardStreamWorkflowChange {
  description?: string;
  processing?: OnboardProcessingWorkflowChange['processors'];
  anomaly_detection: OnboardAnomalyDetectionWorkflowChange['jobs'];
  dashboards: OnboardDashboardsWorkflowChange['dashboards'];
  rules: OnboardRulesWorkflowChange['rules'];
  field_definitions?: OnboardFieldDefinitionsWorkflowChange['field_definitions'];
}

export type OnboardStreamWorkflowGenerateResult =
  StreamWorkflowGenerateResult<OnboardStreamWorkflowChange>;

export type OnboardStreamWorkflowApplyResult = StreamWorkflowApplyResult<Streams.WiredStream.Model>;
