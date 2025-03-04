/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DissectProcessorConfig,
  GrokProcessorConfig,
  ProcessorDefinition,
  ProcessorTypeOf,
} from '@kbn/streams-schema';

export type WithUIAttributes<T extends ProcessorDefinition> = T & {
  id: string;
  type: ProcessorTypeOf<T>;
};

export type ProcessorDefinitionWithUIAttributes = WithUIAttributes<ProcessorDefinition>;

export type GrokFormState = Omit<GrokProcessorConfig, 'patterns'> & {
  type: 'grok';
  patterns: Array<{ value: string }>;
};

export type DissectFormState = DissectProcessorConfig & { type: 'dissect' };

export type ProcessorFormState = GrokFormState | DissectFormState;
