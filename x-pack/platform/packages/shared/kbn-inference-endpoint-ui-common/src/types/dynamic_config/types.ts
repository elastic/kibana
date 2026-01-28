/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TASK_SETTINGS, SERVICE_SETTINGS } from '../../constants';
import { type ServiceProviderKeys } from '../../constants';
import type { FieldsConfiguration } from '../types';

export interface SelectOption {
  label: string;
  value: string;
  icon?: string;
}

export interface Dependency {
  field: string;
  value: string | number | boolean | null;
}

export enum FieldType {
  STRING = 'str',
  INTEGER = 'int',
  BOOLEAN = 'bool',
  MAP = 'map',
}

export interface ConfigCategoryProperties {
  label: string;
  order: number;
  type: 'category';
}

export interface Validation {
  constraint: string | number;
  type: string;
}

export interface ConfigProperties {
  default_value: string | number | boolean | null;
  description: string | null;
  label: string;
  required: boolean;
  sensitive: boolean;
  updatable: boolean;
  type: FieldType;
  supported_task_types: string[];
  location?: typeof SERVICE_SETTINGS | typeof TASK_SETTINGS;
}

interface ConfigEntry extends ConfigProperties {
  key: string;
}

export interface ConfigEntryView extends ConfigEntry {
  isValid: boolean;
  validationErrors: string[];
  value: string | number | boolean | null;
}

type ServiceProviderKeysType = keyof typeof ServiceProviderKeys;
export interface OverrideFieldsContentType {
  serverlessOnly?: boolean;
  hidden?: string[];
  additional?: FieldsConfiguration[];
  supplementalData?: Record<string, Partial<ConfigProperties>>[];
}
export type InternalOverrideFieldsType = {
  [Key in ServiceProviderKeysType | string]?: OverrideFieldsContentType;
};
