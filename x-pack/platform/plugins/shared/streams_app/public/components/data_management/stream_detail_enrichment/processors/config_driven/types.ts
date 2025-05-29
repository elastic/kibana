/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorDefinition } from '@kbn/streams-schema';
import { configDrivenProcessors } from '.';
import { WithUIAttributes } from '../../types';

export interface ConfigDrivenProcessorConfiguration<
  FormStateT,
  ProcessorDefinitionT extends ProcessorDefinition
> {
  type: ConfigDrivenProcessorType;
  inputDisplay: string;
  getDocUrl: (esDocUrl: string) => React.ReactNode;
  defaultFormState: FormStateT;
  convertFormStateToConfig: (formState: FormStateT) => ProcessorDefinitionT;
  convertProcessorToFormState: (processor: WithUIAttributes<ProcessorDefinitionT>) => FormStateT;
  fieldConfigurations: FieldConfiguration[];
  fieldOptions: FieldOptions;
}

export interface FieldOptions {
  includeIgnoreFailures: boolean;
  includeIgnoreMissing: boolean;
  includeCondition: boolean;
  fieldHelpText: string;
}

export interface FieldConfiguration {
  field: string;
  type: 'string' | 'array' | 'boolean';
  required: boolean;
  label: string;
  helpText: React.ReactNode;
}

export type ConfigDrivenProcessors = typeof configDrivenProcessors;
export type ConfigDrivenProcessorType = keyof ConfigDrivenProcessors;
export type ConfigDrivenProcessorFormState =
  ConfigDrivenProcessors[keyof ConfigDrivenProcessors]['defaultFormState'];
