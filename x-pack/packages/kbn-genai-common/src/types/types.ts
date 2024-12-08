/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ConnectorConfigProperties as ConfigProperties } from '@kbn/search-connectors';

export { DisplayType, FieldType } from '@kbn/search-connectors';

export type FieldsConfiguration = Record<string, ConfigProperties>;

export interface InferenceTaskType {
  task_type: string;
  configuration: FieldsConfiguration;
}

export interface InferenceProvider {
  provider: string;
  task_types: InferenceTaskType[];
  logo?: string;
  configuration: FieldsConfiguration;
}

export interface Config {
  taskType: string;
  taskTypeConfig?: Record<string, unknown>;
  inferenceId: string;
  provider: string;
  providerConfig?: Record<string, unknown>;
}

export interface Secrets {
  providerSecrets?: Record<string, unknown>;
}
