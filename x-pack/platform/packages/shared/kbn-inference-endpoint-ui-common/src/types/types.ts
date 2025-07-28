/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigProperties } from './dynamic_config/types';

interface ConfigEntry extends ConfigProperties {
  key: string;
}

export * from './dynamic_config/types';

export interface ConfigEntryView extends ConfigEntry {
  isValid: boolean;
  validationErrors: string[];
  value: string | number | boolean | null;
}

export type FieldsConfiguration = Record<string, ConfigProperties>;

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

export interface InferenceProvider {
  service: string;
  name: string;
  task_types: string[];
  logo?: string;
  configurations: FieldsConfiguration;
}

export interface Secrets {
  providerSecrets?: Record<string, unknown>;
}

export const INFERENCE_ENDPOINT_INTERNAL_API_VERSION = '1';

export interface InferenceEndpoint {
  config: Config;
  secrets: Secrets;
}
