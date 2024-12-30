/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FieldType } from '@kbn/search-connectors';

export { FieldType } from '@kbn/search-connectors';

export interface ConfigProperties {
  default_value: string | number | boolean | null;
  description: string | null;
  label: string;
  required: boolean;
  sensitive: boolean;
  updatable: boolean;
  type: FieldType;
}

interface ConfigEntry extends ConfigProperties {
  key: string;
}

export interface ConfigEntryView extends ConfigEntry {
  isValid: boolean;
  validationErrors: string[];
  value: string | number | boolean | null;
}

export type FieldsConfiguration = Record<string, ConfigProperties>;

export interface InferenceProvider {
  service: string;
  name: string;
  task_types: string[];
  logo?: string;
  configurations: FieldsConfiguration;
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
