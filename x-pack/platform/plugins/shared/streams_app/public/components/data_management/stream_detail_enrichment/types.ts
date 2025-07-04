/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DateProcessorConfig,
  DissectProcessorConfig,
  GrokProcessorConfig,
  ProcessorDefinition,
  ProcessorTypeOf,
} from '@kbn/streams-schema';
import { ManualIngestPipelineProcessorConfig } from '@kbn/streams-schema';
import { DraftGrokExpression } from '@kbn/grok-ui';
import { EnrichmentDataSource } from '../../../../common/url_schema';
import { ConfigDrivenProcessorFormState } from './processors/config_driven/types';

export type WithUIAttributes<T extends ProcessorDefinition> = T & {
  id: string;
  type: ProcessorTypeOf<T>;
};

/**
 * Processors' types
 */
export type ProcessorDefinitionWithUIAttributes = WithUIAttributes<ProcessorDefinition>;

export type GrokFormState = Omit<GrokProcessorConfig, 'patterns'> & {
  type: 'grok';
  patterns: DraftGrokExpression[];
};

export type DissectFormState = DissectProcessorConfig & { type: 'dissect' };

export type DateFormState = DateProcessorConfig & { type: 'date' };

export type ManualIngestPipelineFormState = ManualIngestPipelineProcessorConfig & {
  type: 'manual_ingest_pipeline';
};

export type SpecialisedFormState =
  | GrokFormState
  | DissectFormState
  | DateFormState
  | ManualIngestPipelineFormState;

export type ProcessorFormState = SpecialisedFormState | ConfigDrivenProcessorFormState;

export type ExtractBooleanFields<TInput> = NonNullable<
  TInput extends Record<string, unknown>
    ? {
        [K in keyof TInput]: boolean extends TInput[K] ? K : never;
      }[keyof TInput]
    : never
>;

/**
 * Data sources types
 */
export type EnrichmentDataSourceWithUIAttributes = EnrichmentDataSource & {
  id: string;
};

export type RandomSamplesDataSourceWithUIAttributes = Extract<
  EnrichmentDataSourceWithUIAttributes,
  { type: 'random-samples' }
>;

export type KqlSamplesDataSourceWithUIAttributes = Extract<
  EnrichmentDataSourceWithUIAttributes,
  { type: 'kql-samples' }
>;

export type CustomSamplesDataSourceWithUIAttributes = Extract<
  EnrichmentDataSourceWithUIAttributes,
  { type: 'custom-samples' }
>;
