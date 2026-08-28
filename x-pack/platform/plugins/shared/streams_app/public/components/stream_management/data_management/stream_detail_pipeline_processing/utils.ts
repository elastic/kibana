/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlIdGenerator } from '@elastic/eui';
import type { FlattenRecord } from '@kbn/streams-schema';
import { mapValues } from 'lodash';
import { PRIORITIZED_CONTENT_FIELDS, getDefaultTextField } from '@kbn/streams-plugin/common';
import type { EnrichmentDataSource } from '../../../../../common/url_schema';
import { isSerializableProcessorStep } from './ingest_pipeline_processors';
import type { StreamEnrichmentContextType } from './state_management/stream_enrichment_state_machine/types';
import { configDrivenProcessors } from './steps/blocks/action/config_driven';
import type {
  ConfigDrivenProcessorType,
  ConfigDrivenProcessors,
} from './steps/blocks/action/config_driven/types';
import type {
  ConditionBlockFormState,
  ConvertFormState,
  DateFormState,
  DissectFormState,
  DropFormState,
  EnrichmentDataSourceWithUIAttributes,
  GrokFormState,
  JoinFormState,
  LowercaseFormState,
  NetworkDirectionFormState,
  ProcessorFormState,
  RedactFormState,
  ReplaceFormState,
  SetFormState,
  SplitFormState,
  SortFormState,
  TrimFormState,
  UppercaseFormState,
  EnrichFormState,
  UserAgentFormState,
  RegisteredDomainFormState,
  PipelineStepWithUIAttributes,
  PipelineConditionBlockWithUIAttributes,
  PipelineProcessorDefinition,
  PipelineProcessorDefinitionWithUIAttributes,
  PipelineProcessorType,
} from './types';
import { isPipelineConditionStep, isPipelineProcessorStep } from './types';

/**
 * These are processor types with specialised UI. Other processor types are handled by a generic config-driven UI.
 */
export const SPECIALISED_TYPES = [
  'convert',
  'date',
  'dissect',
  'grok',
  'set',
  'gsub',
  'redact',
  'drop',
  'uppercase',
  'lowercase',
  'trim',
  'join',
  'split',
  'sort',
  'network_direction',
  'enrich',
  'user_agent',
  'registered_domain',
];

interface FormStateDependencies {
  grokCollection: StreamEnrichmentContextType['grokCollection'];
}
interface RecalcColumnWidthsParams {
  columnId: string;
  width: number | undefined; // undefined -> reset width
  prevWidths: Record<string, number | undefined>;
  visibleColumns: string[];
}

export { PRIORITIZED_CONTENT_FIELDS, getDefaultTextField };

const PRIORITIZED_DATE_FIELDS = [
  'timestamp',
  'logtime',
  'initial_date',
  'date',
  'event.time.received',
  'event.ingested',
  'custom.timestamp',
  'attributes.custom.timestamp',
];

const PRIORITIZED_USER_AGENT_FIELDS = ['user_agent.original'];

/**
 * Checks if the sample documents have valid message fields with actual content
 * that can be used for pipeline suggestion generation.
 */
export const hasValidMessageFieldsForSuggestion = (sampleDocs: FlattenRecord[]): boolean => {
  if (!sampleDocs || sampleDocs.length === 0) {
    return false;
  }

  // Check if any of the prioritized content fields exist with non-empty values
  const docsWithValidFields = sampleDocs.filter((doc) => {
    return PRIORITIZED_CONTENT_FIELDS.some((fieldName) => {
      const value = doc[fieldName];
      return value !== undefined && value !== null && String(value).trim().length > 0;
    });
  });

  // Require at least 50% of documents to have valid message fields
  return docsWithValidFields.length >= sampleDocs.length * 0.5;
};

const defaultConvertProcessorFormState = (): ConvertFormState => ({
  action: 'convert' as const,
  field: '',
  target_field: '',
  type: 'string',
  ignore_failure: true,
  ignore_missing: true,
});

const defaultDateProcessorFormState = (sampleDocs: FlattenRecord[]): DateFormState => ({
  action: 'date',
  field: getDefaultTextField(sampleDocs, PRIORITIZED_DATE_FIELDS),
  formats: [],
  target_field: '',
  output_format: '',
  ignore_failure: true,
});

const defaultDissectProcessorFormState = (sampleDocs: FlattenRecord[]): DissectFormState => ({
  action: 'dissect',
  field: getDefaultTextField(sampleDocs, PRIORITIZED_CONTENT_FIELDS),
  pattern: '',
  ignore_failure: true,
  ignore_missing: true,
});

const defaultDropProcessorFormState = (): DropFormState => ({
  action: 'drop',
  ignore_failure: true,
});

const defaultGrokProcessorFormState: (
  sampleDocs: FlattenRecord[],
  formStateDependencies: FormStateDependencies
) => GrokFormState = (
  sampleDocs: FlattenRecord[],
  formStateDependencies: FormStateDependencies
) => ({
  action: 'grok',
  field: getDefaultTextField(sampleDocs, PRIORITIZED_CONTENT_FIELDS),
  patterns: [{ value: '' }],
  ignore_failure: true,
  ignore_missing: true,
});

const defaultSetProcessorFormState = (): SetFormState => ({
  action: 'set' as const,
  field: '',
  value: '',
  ignore_failure: false,
  override: true,
});

const defaultReplaceProcessorFormState = (): ReplaceFormState => ({
  action: 'gsub' as const,
  field: '',
  pattern: '',
  replacement: '',
  ignore_missing: true,
  ignore_failure: true,
});

const defaultRedactProcessorFormState = (sampleDocs: FlattenRecord[]): RedactFormState => ({
  action: 'redact' as const,
  field: getDefaultTextField(sampleDocs, PRIORITIZED_CONTENT_FIELDS),
  patterns: [{ value: '' }], // Start with one empty pattern field (required validation will catch if not filled)
  ignore_missing: true,
  ignore_failure: true,
});

const defaultUppercaseProcessorFormState = (): UppercaseFormState => ({
  action: 'uppercase' as const,
  field: '',
  ignore_failure: true,
  ignore_missing: true,
});

const defaultLowercaseProcessorFormState = (): LowercaseFormState => ({
  action: 'lowercase' as const,
  field: '',
  ignore_failure: true,
  ignore_missing: true,
});

const defaultTrimProcessorFormState = (): TrimFormState => ({
  action: 'trim' as const,
  field: '',
  ignore_failure: true,
  ignore_missing: true,
});

const defaultJoinProcessorFormState = (): JoinFormState => ({
  action: 'join' as const,
  field: '',
  separator: ',',
  ignore_failure: true,
});

const defaultSplitProcessorFormState = (): SplitFormState => ({
  action: 'split' as const,
  field: '',
  separator: '',
  ignore_failure: true,
  ignore_missing: true,
});

const defaultSortProcessorFormState = (): SortFormState => ({
  action: 'sort' as const,
  field: '',
  order: 'asc',
  ignore_failure: true,
});

const defaultUserAgentProcessorFormState = (sampleDocs: FlattenRecord[]): UserAgentFormState => ({
  action: 'user_agent' as const,
  field: getDefaultTextField(sampleDocs, PRIORITIZED_USER_AGENT_FIELDS),
  target_field: 'user_agent',
  ignore_failure: true,
  ignore_missing: true,
});

const defaultNetworkDirectionProcessorFormState = (): NetworkDirectionFormState => ({
  action: 'network_direction' as const,
  source_ip: '',
  destination_ip: '',
  internal_networks: [],
  target_field: 'attributes.network.direction',
  ignore_failure: true,
  ignore_missing: true,
});

const defaultEnrichProcessorFormState = (): EnrichFormState => ({
  action: 'enrich' as const,
  field: '',
  policy_name: '',
  target_field: '',
  ignore_failure: true,
  ignore_missing: true,
  override: true,
});

const defaultRegisteredDomainProcessorFormState = (): RegisteredDomainFormState => ({
  action: 'registered_domain' as const,
  prefix: 'domain',
  expression: '',
  ignore_failure: true,
  ignore_missing: true,
});

const configDrivenDefaultFormStates = mapValues(
  configDrivenProcessors,
  (config) => () => config.defaultFormState
) as {
  [TKey in ConfigDrivenProcessorType]: () => ConfigDrivenProcessors[TKey]['defaultFormState'];
};

const defaultProcessorFormStateByType: Record<
  PipelineProcessorType,
  (sampleDocs: FlattenRecord[], formStateDependencies: FormStateDependencies) => ProcessorFormState
> = {
  convert: defaultConvertProcessorFormState,
  date: defaultDateProcessorFormState,
  dissect: defaultDissectProcessorFormState,
  drop: defaultDropProcessorFormState,
  grok: defaultGrokProcessorFormState,
  gsub: defaultReplaceProcessorFormState,
  redact: defaultRedactProcessorFormState,
  uppercase: defaultUppercaseProcessorFormState,
  lowercase: defaultLowercaseProcessorFormState,
  trim: defaultTrimProcessorFormState,
  set: defaultSetProcessorFormState,
  join: defaultJoinProcessorFormState,
  split: defaultSplitProcessorFormState,
  sort: defaultSortProcessorFormState,
  network_direction: defaultNetworkDirectionProcessorFormState,
  enrich: defaultEnrichProcessorFormState,
  user_agent: defaultUserAgentProcessorFormState,
  registered_domain: defaultRegisteredDomainProcessorFormState,
  ...configDrivenDefaultFormStates,
};

export const getDefaultFormStateByType = (
  type: PipelineProcessorType,
  sampleDocuments: FlattenRecord[],
  formStateDependencies: FormStateDependencies
) => defaultProcessorFormStateByType[type](sampleDocuments, formStateDependencies);

const getWrappedPatternValue = (pattern: string | { value: string }) =>
  typeof pattern === 'string' ? pattern : pattern.value;

export const getFormStateFromActionStep = (
  sampleDocuments: FlattenRecord[],
  formStateDependencies: FormStateDependencies,
  step?: PipelineProcessorDefinitionWithUIAttributes
): ProcessorFormState => {
  if (!step) return defaultGrokProcessorFormState(sampleDocuments, formStateDependencies);

  // Handle grok separately to convert patterns from string[] to { value: string }[]
  if (step.action === 'grok') {
    const { customIdentifier, parentId, patterns, ...restStep } = step;
    return structuredClone({
      ...restStep,
      patterns: patterns.map((pattern) => ({ value: getWrappedPatternValue(pattern) })),
    }) as GrokFormState;
  }

  if (step.action === 'redact') {
    const { customIdentifier, parentId, patterns, ...restStep } = step;
    // Convert string[] patterns to RedactPatternWrapper[] for useFieldArray compatibility
    return {
      ...structuredClone(restStep),
      patterns: patterns.map((pattern) => ({ value: getWrappedPatternValue(pattern) })),
    };
  }

  if (step.action === 'network_direction') {
    const {
      customIdentifier,
      parentId,
      internal_networks: internalNetworks,
      internal_networks_field: internalNetworksField,
      ...restStep
    } = step;
    const clone: NetworkDirectionFormState = structuredClone(restStep);

    if (internalNetworks) {
      clone.internal_networks = internalNetworks.map((internalNetwork) =>
        typeof internalNetwork === 'string' ? { value: internalNetwork } : internalNetwork
      );
    }

    if (internalNetworksField) {
      clone.internal_networks_field = internalNetworksField;
    }

    return clone;
  }

  if (
    step.action === 'dissect' ||
    step.action === 'date' ||
    step.action === 'drop' ||
    step.action === 'set' ||
    step.action === 'convert' ||
    step.action === 'gsub' ||
    step.action === 'uppercase' ||
    step.action === 'lowercase' ||
    step.action === 'trim' ||
    step.action === 'join' ||
    step.action === 'split' ||
    step.action === 'sort' ||
    step.action === 'enrich' ||
    step.action === 'user_agent' ||
    step.action === 'registered_domain'
  ) {
    const { customIdentifier, parentId, ...restStep } = step;
    return structuredClone({
      ...restStep,
    });
  }

  if (step.action in configDrivenProcessors) {
    const { customIdentifier, parentId, ...restStep } = step;
    return configDrivenProcessors[
      step.action as ConfigDrivenProcessorType
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ].convertProcessorToFormState(restStep as any);
  }

  throw new Error(`Form state for processor type "${step.action}" is not implemented.`);
};

export const getFormStateFromConditionStep = (
  step: PipelineConditionBlockWithUIAttributes
): ConditionBlockFormState => {
  return structuredClone({
    ...step,
  });
};

export const convertConditionBlockFormStateToConfiguration = (
  formState: ConditionBlockFormState
): {
  conditionBlockDefinition: PipelineConditionBlockWithUIAttributes;
} => {
  return {
    conditionBlockDefinition: {
      ...formState,
    },
  };
};

export const convertFormStateToProcessor = (
  formState: ProcessorFormState
): {
  processorDefinition: ProcessorFormState;
} => {
  return { processorDefinition: formState };
};

const createProcessorGuardByType =
  <TProcessorType extends PipelineProcessorType>(type: TProcessorType) =>
  (
    processor: PipelineProcessorDefinition
  ): processor is Extract<PipelineProcessorDefinition, { action: TProcessorType }> =>
    processor.action === type;

export const isDateProcessor = createProcessorGuardByType('date');
export const isDissectProcessor = createProcessorGuardByType('dissect');
export const isGrokProcessor = createProcessorGuardByType('grok');
export const isSetProcessor = createProcessorGuardByType('set');

const createId = htmlIdGenerator();

const dataSourceToUIDefinition = <TEnrichementDataSource extends EnrichmentDataSource>(
  dataSource: TEnrichementDataSource
): EnrichmentDataSourceWithUIAttributes => ({
  id: createId(),
  ...dataSource,
});

const dataSourceToUrlSchema = (
  dataSourceWithUIAttributes: EnrichmentDataSourceWithUIAttributes
): EnrichmentDataSource => {
  const { id, ...dataSource } = dataSourceWithUIAttributes;
  return dataSource;
};

export const dataSourceConverter = {
  toUIDefinition: dataSourceToUIDefinition,
  toUrlSchema: dataSourceToUrlSchema,
};

export const getDefaultGrokProcessor = ({
  sampleDocs,
}: {
  sampleDocs: FlattenRecord[];
}): ProcessorFormState => ({
  action: 'grok',
  field: getDefaultTextField(sampleDocs, PRIORITIZED_CONTENT_FIELDS),
  patterns: [{ value: '' }],
  ignore_failure: true,
  ignore_missing: true,
});

export const recalcColumnWidths = ({
  columnId,
  width,
  prevWidths,
  visibleColumns,
}: RecalcColumnWidthsParams): Record<string, number | undefined> => {
  const next = { ...prevWidths };
  if (width === undefined) {
    delete next[columnId];
  } else {
    next[columnId] = width;
  }

  const allExplicit = visibleColumns.every((c) => next[c] !== undefined);
  if (allExplicit) {
    delete next[visibleColumns[visibleColumns.length - 1]];
  }

  return next;
};

// Get valid steps for simulation
// This will return valid action blocks, and valid where blocks, where
// where blocks are invalid all their children are also skipped.
export const getValidSteps = (
  steps: PipelineStepWithUIAttributes[]
): PipelineStepWithUIAttributes[] => {
  const validSteps: PipelineStepWithUIAttributes[] = [];

  // Helper to recursively skip parked condition blocks and their children
  function processStep(step: PipelineStepWithUIAttributes): boolean {
    if (isPipelineConditionStep(step)) {
      return false;
    } else if (isPipelineProcessorStep(step)) {
      // Action step: check that the native ingest pipeline serializer can emit it.
      // Parked non-native steps are kept in the tree but intentionally skipped.
      if (!isSerializableProcessorStep(step)) {
        return false;
      }

      validSteps.push(step);
      return true;
    }

    return false;
  }

  // We assume steps is a flat array, so we need to skip children of invalid where blocks
  const skipParentIds = new Set<string>();

  for (const step of steps) {
    // If this step's parent is in skipParentIds, skip it (and its children)
    if (step.parentId && skipParentIds.has(step.parentId)) {
      skipParentIds.add(step.customIdentifier);
      continue;
    }

    const isValid = processStep(step);

    // If this is an invalid where block, add its id to skipParentIds
    if (isPipelineConditionStep(step) && !isValid) {
      skipParentIds.add(step.customIdentifier);
    }
  }
  return validSteps;
};

export const getStepPanelColour = (stepIndex: number) => {
  const isEven = stepIndex % 2 === 0;
  return isEven ? 'subdued' : undefined;
};
