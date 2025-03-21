/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorDefinition } from '@kbn/streams-schema';
import { configDrivenProcessors } from '.';
import { WithUIAttributes } from '../../types';
import type { KvProcessorFormState } from './configs/kv';
import type { GeoIpProcessorFormState } from './configs/geoip';
import type { RenameProcessorFormState } from './configs/rename';
import type { SetProcessorFormState } from './configs/set';
import type { UrlDecodeProcessorFormState } from './configs/url_decode';
import type { UserAgentProcessorFormState } from './configs/user_agent';

export type ConfigDrivenProcessorFormState =
  | KvProcessorFormState
  | GeoIpProcessorFormState
  | RenameProcessorFormState
  | SetProcessorFormState
  | UrlDecodeProcessorFormState
  | UserAgentProcessorFormState;

export interface ConfigDrivenProcessorConfiguration<
  FormStateT,
  ProcessorDefinitionT extends ProcessorDefinition
> {
  value: ConfigDrivenProcessorType;
  inputDisplay: string;
  getDocUrl: (esDocUrl: string) => JSX.Element;
  defaultFormState: FormStateT;
  convertFormStateToConfig: (formState: FormStateT) => ProcessorDefinitionT;
  convertProcessorToFormState: (processor: WithUIAttributes<ProcessorDefinitionT>) => FormStateT;
  fieldConfigurations: FieldConfiguration[];
  fieldOptions: {
    includeIgnoreFailures: boolean;
    includeIgnoreMissing: boolean;
    includeCondition: boolean;
    fieldHelpText: string;
  };
}

export interface FieldConfiguration {
  field: string;
  type: 'string' | 'array' | 'boolean';
  required: boolean;
  label: string;
  helpText: JSX.Element;
}

export type ConfigDrivenProcessorType = keyof typeof configDrivenProcessors;
