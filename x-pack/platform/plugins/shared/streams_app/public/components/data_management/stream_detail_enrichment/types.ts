/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DraftGrokExpression } from '@kbn/grok-ui';
import type {
  ConvertProcessor,
  DateProcessor,
  DissectProcessor,
  GrokProcessor,
  ManualIngestPipelineProcessor,
  SetProcessor,
  StreamlangWhereBlockWithUIAttributes,
} from '@kbn/streamlang';
import type { EnrichmentDataSource } from '../../../../common/url_schema';
import type { ConfigDrivenProcessorFormState } from './steps/blocks/action/config_driven/types';

/**
 * Processors' types
 */

export type GrokFormState = Omit<GrokProcessor, 'patterns'> & {
  patterns: DraftGrokExpression[];
};

export type DissectFormState = DissectProcessor;
export type DateFormState = DateProcessor;
export type ManualIngestPipelineFormState = ManualIngestPipelineProcessor;
export type ConvertFormState = ConvertProcessor;

export type SetFormState = SetProcessor;

export type SpecialisedFormState =
  | GrokFormState
  | DissectFormState
  | DateFormState
  | ManualIngestPipelineFormState
  | ConvertFormState
  | SetFormState;

export type ProcessorFormState = SpecialisedFormState | ConfigDrivenProcessorFormState;
export type WhereBlockFormState = StreamlangWhereBlockWithUIAttributes;

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
  { type: 'latest-samples' }
>;

export type KqlSamplesDataSourceWithUIAttributes = Extract<
  EnrichmentDataSourceWithUIAttributes,
  { type: 'kql-samples' }
>;

export type CustomSamplesDataSourceWithUIAttributes = Extract<
  EnrichmentDataSourceWithUIAttributes,
  { type: 'custom-samples' }
>;
