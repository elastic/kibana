/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SERVICE_SETTINGS = 'service_settings';
export const TASK_SETTINGS = 'task_settings';

export enum FieldType {
  STRING = 'str',
  INTEGER = 'int',
  BOOLEAN = 'bool',
  MAP = 'map',
  LIST = 'list',
}

export type ConfigValue = string | number | boolean | null | Record<string, string> | string[];

export interface ConfigProperties {
  default_value: ConfigValue;
  description: string | null;
  label: string;
  required: boolean;
  sensitive: boolean;
  updatable: boolean;
  type: FieldType;
  supported_task_types: string[];
  location?: typeof SERVICE_SETTINGS | typeof TASK_SETTINGS;
}

export type FieldsConfiguration = Record<string, ConfigProperties>;

/**
 * Optional capabilities advertised by an inference service in `GET _inference/_services`.
 * Omitted entirely by services (and Elasticsearch versions) that do not support any of them.
 */
export interface InferenceServiceFeatures {
  non_streaming_chat?: {
    supported: boolean;
  };
}

export interface InferenceProvider {
  service: string;
  name: string;
  task_types: string[];
  logo?: string;
  configurations: FieldsConfiguration;
  features?: InferenceServiceFeatures;
}

/**
 * Whether a service advertises support for non-streaming `chat_completion` requests.
 * A missing `features` object means the service (or the ES version) does not support it.
 */
export const supportsNonStreamingChat = (
  provider: Pick<InferenceProvider, 'features'> | undefined
): boolean => provider?.features?.non_streaming_chat?.supported === true;
