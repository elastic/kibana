/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestAppendProcessor,
  IngestConvertProcessor,
  IngestDateProcessor,
  IngestDissectProcessor,
  IngestDropProcessor,
  IngestEnrichProcessor,
  IngestGrokProcessor,
  IngestGsubProcessor,
  IngestJoinProcessor,
  IngestLowercaseProcessor,
  IngestNetworkDirectionProcessor,
  IngestRedactProcessor,
  IngestRegisteredDomainProcessor,
  IngestRemoveProcessor,
  IngestRenameProcessor,
  IngestSetProcessor,
  IngestSortProcessor,
  IngestSplitProcessor,
  IngestTrimProcessor,
  IngestUppercaseProcessor,
  IngestUriPartsProcessor,
  IngestUserAgentProcessor,
} from '@elastic/elasticsearch/lib/api/types';
import type { EnrichmentDataSource } from '../../../../../common/url_schema';

/**
 * Processors' types
 */

// GrokFormState uses wrapped patterns for useFieldArray compatibility
export interface GrokPatternField {
  value: string;
}

export type GrokFormState = Omit<NativeProcessorFormState<'grok'>, 'patterns'> & {
  patterns: GrokPatternField[];
};

export interface InternalNetworksValue {
  value: string;
}

export interface ProcessorUiMetadata {
  customIdentifier?: string;
  parentId?: string | null;
  branch?: PipelineStepBranch;
  description?: string;
}

export type PipelineProcessorType =
  | 'append'
  | 'convert'
  | 'date'
  | 'dissect'
  | 'drop'
  | 'enrich'
  | 'grok'
  | 'gsub'
  | 'join'
  | 'lowercase'
  | 'network_direction'
  | 'redact'
  | 'registered_domain'
  | 'remove'
  | 'rename'
  | 'set'
  | 'sort'
  | 'split'
  | 'trim'
  | 'uppercase'
  | 'uri_parts'
  | 'user_agent';

export type NativePipelineProcessorType = PipelineProcessorType;

export interface NativeProcessorConfigMap {
  append: IngestAppendProcessor;
  convert: IngestConvertProcessor;
  date: IngestDateProcessor;
  dissect: IngestDissectProcessor;
  drop: IngestDropProcessor;
  enrich: IngestEnrichProcessor;
  grok: IngestGrokProcessor;
  gsub: IngestGsubProcessor;
  join: IngestJoinProcessor;
  lowercase: IngestLowercaseProcessor;
  network_direction: IngestNetworkDirectionProcessor;
  redact: IngestRedactProcessor;
  registered_domain: IngestRegisteredDomainProcessor;
  remove: IngestRemoveProcessor;
  rename: IngestRenameProcessor;
  set: IngestSetProcessor;
  sort: IngestSortProcessor;
  split: IngestSplitProcessor;
  trim: IngestTrimProcessor;
  uppercase: IngestUppercaseProcessor;
  uri_parts: IngestUriPartsProcessor;
  user_agent: IngestUserAgentProcessor;
}

export type ProcessorConfig<TProcessor extends NativePipelineProcessorType> =
  NativeProcessorConfigMap[TProcessor];

export type Simplify<T> = { [K in keyof T]: T[K] };

export interface ProcessorConditionScript {
  source?: string;
  id?: string;
  params?: Record<string, unknown>;
  lang?: string;
  options?: Record<string, string>;
}

export type ProcessorFormConfig<TProcessor extends NativePipelineProcessorType> = Omit<
  ProcessorConfig<TProcessor>,
  'if' | 'on_failure'
> & {
  /**
   * The Elasticsearch type for `if` includes a full search request body through
   * ScriptSource. The form only needs to preserve the condition and edit the
   * string case, so keep RHF away from the full search type graph.
   */
  if?: string | ProcessorConditionScript;
  /**
   * Ingest processors can recursively nest more processors in `on_failure`.
   * The UI preserves this field, but RHF's FieldPath types cannot walk the
   * recursive Elasticsearch type without hitting deep-instantiation limits.
   */
  on_failure?: Array<Record<string, unknown>>;
};

export type NativeProcessorFormState<TProcessor extends NativePipelineProcessorType> = Simplify<
  ProcessorUiMetadata & {
    action: TProcessor;
  } & ProcessorFormConfig<TProcessor>
>;

export type DissectFormState = NativeProcessorFormState<'dissect'>;
export type DateFormState = NativeProcessorFormState<'date'>;
export type DropFormState = NativeProcessorFormState<'drop'>;
export type ConvertFormState = NativeProcessorFormState<'convert'>;
export type ReplaceFormState = NativeProcessorFormState<'gsub'>;
export type AppendFormState = NativeProcessorFormState<'append'>;
export type RemoveFormState = NativeProcessorFormState<'remove'>;
export type RenameFormState = NativeProcessorFormState<'rename'>;
export type UriPartsFormState = NativeProcessorFormState<'uri_parts'>;

/**
 * Wrapper for for useFieldArray compatibility
 */
export interface RedactPatternField {
  value: string;
}

export type RedactFormState = Omit<NativeProcessorFormState<'redact'>, 'patterns'> & {
  patterns: RedactPatternField[];
};
export type SetFormState = NativeProcessorFormState<'set'>;
export type UppercaseFormState = NativeProcessorFormState<'uppercase'>;
export type LowercaseFormState = NativeProcessorFormState<'lowercase'>;
export type TrimFormState = NativeProcessorFormState<'trim'>;
export type JoinFormState = NativeProcessorFormState<'join'>;
export type SplitFormState = NativeProcessorFormState<'split'>;
export type SortFormState = NativeProcessorFormState<'sort'>;
export type NetworkDirectionFormState = Omit<
  NativeProcessorFormState<'network_direction'>,
  'internal_networks' | 'internal_networks_field'
> & {
  internal_networks?: InternalNetworksValue[];
  internal_networks_field?: string;
};
export type EnrichFormState = NativeProcessorFormState<'enrich'>;
export type UserAgentFormState = NativeProcessorFormState<'user_agent'>;
export type RegisteredDomainFormState = Omit<
  NativeProcessorFormState<'registered_domain'>,
  'field' | 'target_field'
> & {
  expression: string;
  prefix: string;
};

// Parked non-native forms retained until ingest pipelines support equivalent
// native processors.
export interface ConcatFormState extends ProcessorUiMetadata {
  action: 'concat';
  from: Array<{ type: 'field' | 'literal'; value: string }>;
  to: string;
  separator: string;
}

export interface MathFormState extends ProcessorUiMetadata {
  action: 'math';
  expression: string;
  to: string;
}

export type SpecialisedFormState =
  | AppendFormState
  | GrokFormState
  | DissectFormState
  | DateFormState
  | DropFormState
  | ConvertFormState
  | ReplaceFormState
  | RedactFormState
  | SetFormState
  | UppercaseFormState
  | LowercaseFormState
  | TrimFormState
  | JoinFormState
  | SplitFormState
  | SortFormState
  | NetworkDirectionFormState
  | EnrichFormState
  | UserAgentFormState
  | RegisteredDomainFormState
  | RemoveFormState
  | RenameFormState
  | UriPartsFormState;

export type ProcessorFormState = SpecialisedFormState;

export type PipelineStepBranch = 'if' | 'else';
export type PipelineProcessorDefinition = ProcessorFormState;
export type PipelineProcessorDefinitionWithUIAttributes = ProcessorFormState & {
  customIdentifier: string;
  parentId: string | null;
  branch?: PipelineStepBranch;
};

// Condition blocks are parked in the copied tree until ingest pipelines can
// represent nested conditional branches natively.
export interface PipelineConditionBlockWithUIAttributes {
  condition: {
    steps: PipelineStepWithUIAttributes[];
    else?: PipelineStepWithUIAttributes[];
  };
  customIdentifier: string;
  parentId: string | null;
  branch?: PipelineStepBranch;
  description?: string;
}

export type PipelineStepWithUIAttributes =
  | PipelineProcessorDefinitionWithUIAttributes
  | PipelineConditionBlockWithUIAttributes;

export const isPipelineProcessorStep = (
  step: PipelineStepWithUIAttributes | undefined
): step is PipelineProcessorDefinitionWithUIAttributes => {
  return Boolean(step && 'action' in step);
};

export const isPipelineConditionStep = (
  step: PipelineStepWithUIAttributes | undefined
): step is PipelineConditionBlockWithUIAttributes => {
  return Boolean(step && 'condition' in step);
};

export interface PipelineProcessorsUiDefinition {
  steps: PipelineStepWithUIAttributes[];
}
export interface ConditionBlockFormState extends ProcessorUiMetadata {
  customIdentifier: string;
  parentId: string | null;
  condition: {
    steps: PipelineStepWithUIAttributes[];
    else?: PipelineStepWithUIAttributes[];
  };
}

export type ExtractBooleanFields<TInput> = NonNullable<
  TInput extends object
    ? {
        [K in keyof TInput]: Extract<TInput[K], boolean> extends never ? never : K;
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
