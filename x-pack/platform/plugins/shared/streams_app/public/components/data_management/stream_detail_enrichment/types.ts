/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConvertProcessor,
  DateProcessor,
  DissectProcessor,
  DropDocumentProcessor,
  GrokProcessor,
  ManualIngestPipelineProcessor,
  MathProcessor,
  ReplaceProcessor,
  RedactProcessor,
  SetProcessor,
  StreamlangConditionBlockWithUIAttributes,
  UppercaseProcessor,
  LowercaseProcessor,
  TrimProcessor,
  JoinProcessor,
  ConcatProcessor,
} from '@kbn/streamlang';
import type { EnrichmentDataSource } from '../../../../common/url_schema';
import type { ConfigDrivenProcessorFormState } from './steps/blocks/action/config_driven/types';

/**
 * Processors' types
 */

// GrokFormState uses wrapped patterns for useFieldArray compatibility
export interface GrokPatternField {
  value: string;
}

export type GrokFormState = Omit<GrokProcessor, 'patterns'> & {
  patterns: GrokPatternField[];
};

export type DissectFormState = DissectProcessor;
export type DateFormState = DateProcessor;
export type DropFormState = DropDocumentProcessor;
export type ManualIngestPipelineFormState = ManualIngestPipelineProcessor;
export type ConvertFormState = ConvertProcessor;
export type ReplaceFormState = ReplaceProcessor;

/**
 * Wrapper for for useFieldArray compatibility
 */
export interface RedactPatternField {
  value: string;
}

export type RedactFormState = Omit<RedactProcessor, 'patterns'> & {
  patterns: RedactPatternField[];
};
export type SetFormState = SetProcessor;
export type MathFormState = MathProcessor;
export type UppercaseFormState = UppercaseProcessor;
export type LowercaseFormState = LowercaseProcessor;
export type TrimFormState = TrimProcessor;
export type JoinFormState = JoinProcessor;
export type ConcatFormState = ConcatProcessor;

export type SpecialisedFormState =
  | GrokFormState
  | DissectFormState
  | DateFormState
  | DropFormState
  | ManualIngestPipelineFormState
  | ConvertFormState
  | ReplaceFormState
  | RedactFormState
  | SetFormState
  | MathFormState
  | UppercaseFormState
  | LowercaseFormState
  | TrimFormState
  | JoinFormState
  | ConcatFormState;

export type ProcessorFormState = SpecialisedFormState | ConfigDrivenProcessorFormState;
export type ConditionBlockFormState = StreamlangConditionBlockWithUIAttributes;

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

export type FailureStoreDataSourceWithUIAttributes = Extract<
  EnrichmentDataSourceWithUIAttributes,
  { type: 'failure-store' }
>;
