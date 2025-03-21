/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DateProcessorConfig,
  DissectProcessorConfig,
  FieldDefinitionType,
  GrokProcessorConfig,
  ProcessorDefinition,
  ProcessorTypeOf,
} from '@kbn/streams-schema';

import { ConfigDrivenProcessorFormState } from './processors/config_driven/types';

export type WithUIAttributes<T extends ProcessorDefinition> = T & {
  id: string;
  type: ProcessorTypeOf<T>;
};

export type ProcessorDefinitionWithUIAttributes = WithUIAttributes<ProcessorDefinition>;

export interface DetectedField {
  name: string;
  type?: FieldDefinitionType | 'system';
}

export type GrokFormState = Omit<GrokProcessorConfig, 'patterns'> & {
  type: 'grok';
  patterns: Array<{ value: string }>;
};

export type DissectFormState = DissectProcessorConfig & { type: 'dissect' };

export type DateFormState = DateProcessorConfig & { type: 'date' };

export type SpecialisedFormState = GrokFormState | DissectFormState | DateFormState;

export type ProcessorFormState = SpecialisedFormState | ConfigDrivenProcessorFormState;
