/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ExtractionMethod } from '../../common/steps/extract/extraction_contract';

export interface FormatOverride {
  method: 'tika' | 'inference' | 'workflow' | 'connector';
  inferenceId?: string;
  workflowId?: string;
  connectorId?: string;
}

export interface ExtractionGlobalConfig {
  method: 'tika' | 'inference' | 'workflow' | 'connector';
  inferenceId?: string;
  workflowId?: string;
  connectorId?: string;
  formatOverrides?: Record<string, FormatOverride>;
}

export interface ExtractionConfigAttributes {
  method: 'tika' | 'inference' | 'workflow' | 'connector';
  inferenceId?: string;
  workflowId?: string;
  connectorId?: string;
  formatOverrides?: Record<string, FormatOverride>;
}
