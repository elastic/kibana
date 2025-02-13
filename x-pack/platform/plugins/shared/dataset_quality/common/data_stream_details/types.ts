/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Integration } from '../data_streams_stats/integration';

export interface AnalyzeDegradedFieldsParams {
  dataStream: string;
  lastBackingIndex: string;
  degradedField: string;
}

export interface UpdateFieldLimitParams {
  dataStream: string;
  newFieldLimit: number;
}

export interface CheckAndLoadIntegrationParams {
  dataStream: string;
}

export interface IntegrationType {
  isIntegration: boolean;
  areAssetsAvailable: boolean;
  integration?: Integration;
}
