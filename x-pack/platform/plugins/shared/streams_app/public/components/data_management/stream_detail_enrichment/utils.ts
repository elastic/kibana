/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import {
  FlattenRecord,
  ProcessorDefinition,
  ProcessorDefinitionWithId,
  ProcessorType,
  getProcessorType,
  isSchema,
  processorDefinitionSchema,
} from '@kbn/streams-schema';
import { htmlIdGenerator } from '@elastic/eui';
import { countBy, isEmpty, mapValues, omit, orderBy } from 'lodash';
import { DraftGrokExpression } from '@kbn/grok-ui';
import { EnrichmentDataSource } from '../../../../common/url_schema';
import {
  DissectFormState,
  ProcessorDefinitionWithUIAttributes,
  GrokFormState,
  ProcessorFormState,
  WithUIAttributes,
  DateFormState,
  ManualIngestPipelineFormState,
  EnrichmentDataSourceWithUIAttributes,
} from './types';
import { ALWAYS_CONDITION } from '../../../util/condition';
import { configDrivenProcessors } from './processors/config_driven';
import {
  ConfigDrivenProcessorType,
  ConfigDrivenProcessors,
} from './processors/config_driven/types';
import type { StreamEnrichmentContextType } from './state_management/stream_enrichment_state_machine/types';
import { ProcessorResources } from './state_management/processor_state_machine';

/**
 * These are processor types with specialised UI. Other processor types are handled by a generic config-driven UI.
 */
export const SPECIALISED_TYPES = ['date', 'dissect', 'grok'];

interface FormStateDependencies {
  grokCollection: StreamEnrichmentContextType['grokCollection'];
}
interface RecalcColumnWidthsParams {
  columnId: string;
  width: number | undefined; // undefined -> reset width
  prevWidths: Record<string, number | undefined>;
  visibleColumns: string[];
}

const PRIORITIZED_CONTENT_FIELDS = [
  'message',
  'body.text',
  'error.message',
  'event.original',
  'attributes.exception.message',
];

const PRIORITIZED_DATE_FIELDS = [
  'timestamp',
  'logtime',
  'initial_date',
  'date',
  'event.time.received',
  'event.ingested',
];

const getDefaultTextField = (sampleDocs: FlattenRecord[], prioritizedFields: string[]) => {
  // Count occurrences of well-known text fields in the sample documents
  const acceptableDefaultFields = sampleDocs.flatMap((doc) =>
    Object.keys(doc).filter((key) => prioritizedFields.includes(key))
  );
  const acceptableFieldsOccurrences = countBy(acceptableDefaultFields);

  // Sort by count descending first, then by order of field in prioritizedFields
  const sortedFields = orderBy(
    Object.entries(acceptableFieldsOccurrences),
    [
      ([_field, occurrencies]) => occurrencies, // Sort entries by occurrencies descending
      ([field]) => prioritizedFields.indexOf(field), // Sort entries by priority order in well-known fields
    ],
    ['desc', 'asc']
  );

  const mostCommonField = sortedFields[0];
  return mostCommonField ? mostCommonField[0] : '';
};

const defaultDateProcessorFormState = (sampleDocs: FlattenRecord[]): DateFormState => ({
  type: 'date',
  field: getDefaultTextField(sampleDocs, PRIORITIZED_DATE_FIELDS),
  formats: [],
  locale: '',
  target_field: '',
  timezone: '',
  output_format: '',
  ignore_failure: true,
  if: ALWAYS_CONDITION,
});

const defaultDissectProcessorFormState = (sampleDocs: FlattenRecord[]): DissectFormState => ({
  type: 'dissect',
  field: getDefaultTextField(sampleDocs, PRIORITIZED_CONTENT_FIELDS),
  pattern: '',
  ignore_failure: true,
  ignore_missing: true,
  if: ALWAYS_CONDITION,
});

const defaultGrokProcessorFormState: (
  sampleDocs: FlattenRecord[],
  formStateDependencies: FormStateDependencies
) => GrokFormState = (
  sampleDocs: FlattenRecord[],
  formStateDependencies: FormStateDependencies
) => ({
  type: 'grok',
  field: getDefaultTextField(sampleDocs, PRIORITIZED_CONTENT_FIELDS),
  patterns: [new DraftGrokExpression(formStateDependencies.grokCollection, '')],
  pattern_definitions: {},
  ignore_failure: true,
  ignore_missing: true,
  if: ALWAYS_CONDITION,
});

const defaultManualIngestPipelineProcessorFormState = (): ManualIngestPipelineFormState => ({
  type: 'manual_ingest_pipeline',
  processors: [],
  ignore_failure: true,
  if: ALWAYS_CONDITION,
});

const configDrivenDefaultFormStates = mapValues(
  configDrivenProcessors,
  (config) => () => config.defaultFormState
) as {
  [TKey in ConfigDrivenProcessorType]: () => ConfigDrivenProcessors[TKey]['defaultFormState'];
};

const defaultProcessorFormStateByType: Record<
  ProcessorType,
  (sampleDocs: FlattenRecord[], formStateDependencies: FormStateDependencies) => ProcessorFormState
> = {
  date: defaultDateProcessorFormState,
  dissect: defaultDissectProcessorFormState,
  grok: defaultGrokProcessorFormState,
  manual_ingest_pipeline: defaultManualIngestPipelineProcessorFormState,
  ...configDrivenDefaultFormStates,
};

export const getDefaultFormStateByType = (
  type: ProcessorType,
  sampleDocuments: FlattenRecord[],
  formStateDependencies: FormStateDependencies
) => defaultProcessorFormStateByType[type](sampleDocuments, formStateDependencies);

export const getFormStateFrom = (
  sampleDocuments: FlattenRecord[],
  formStateDependencies: FormStateDependencies,
  processor?: ProcessorDefinitionWithUIAttributes
): ProcessorFormState => {
  if (!processor) return defaultGrokProcessorFormState(sampleDocuments, formStateDependencies);

  if (isGrokProcessor(processor)) {
    const { grok } = processor;

    const clone: GrokFormState = structuredClone({
      ...omit(grok, 'patterns'),
      patterns: [],
      type: 'grok',
    });

    clone.patterns = grok.patterns.map(
      (pattern) => new DraftGrokExpression(formStateDependencies.grokCollection, pattern)
    );

    return clone;
  }

  if (isDissectProcessor(processor)) {
    const { dissect } = processor;

    return structuredClone({
      ...dissect,
      type: 'dissect',
    });
  }

  if (isManualIngestPipelineJsonProcessor(processor)) {
    const { manual_ingest_pipeline } = processor;

    return structuredClone({
      ...manual_ingest_pipeline,
      type: 'manual_ingest_pipeline',
    });
  }

  if (isDateProcessor(processor)) {
    const { date } = processor;

    return structuredClone({
      ...date,
      type: 'date',
    });
  }

  if (processor.type in configDrivenProcessors) {
    return configDrivenProcessors[
      processor.type as ConfigDrivenProcessorType
    ].convertProcessorToFormState(processor as any);
  }

  throw new Error(`Form state for processor type "${processor.type}" is not implemented.`);
};

export const convertFormStateToProcessor = (
  formState: ProcessorFormState
): {
  processorDefinition: ProcessorDefinition;
  processorResources?: ProcessorResources;
} => {
  if (formState.type === 'grok') {
    const { patterns, field, pattern_definitions, ignore_failure, ignore_missing } = formState;

    return {
      processorDefinition: {
        grok: {
          if: formState.if,
          patterns: patterns
            .map((pattern) => pattern.getExpression())
            .filter((pattern): pattern is string => pattern !== undefined),
          field,
          pattern_definitions,
          ignore_failure,
          ignore_missing,
        },
      },
      processorResources: {
        grokExpressions: patterns,
      },
    };
  }

  if (formState.type === 'dissect') {
    const { field, pattern, append_separator, ignore_failure, ignore_missing } = formState;

    return {
      processorDefinition: {
        dissect: {
          if: formState.if,
          field,
          pattern,
          append_separator: isEmpty(append_separator) ? undefined : append_separator,
          ignore_failure,
          ignore_missing,
        },
      },
    };
  }

  if (formState.type === 'manual_ingest_pipeline') {
    const { processors, ignore_failure } = formState;

    return {
      processorDefinition: {
        manual_ingest_pipeline: {
          if: formState.if,
          processors,
          ignore_failure,
        },
      },
    };
  }

  if (formState.type === 'date') {
    const { field, formats, locale, ignore_failure, target_field, timezone, output_format } =
      formState;

    return {
      processorDefinition: {
        date: {
          if: formState.if,
          field,
          formats,
          ignore_failure,
          locale: isEmpty(locale) ? undefined : locale,
          target_field: isEmpty(target_field) ? undefined : target_field,
          timezone: isEmpty(timezone) ? undefined : timezone,
          output_format: isEmpty(output_format) ? undefined : output_format,
        },
      },
    };
  }

  if (configDrivenProcessors[formState.type]) {
    return {
      processorDefinition: configDrivenProcessors[formState.type].convertFormStateToConfig(
        formState as any
      ),
    };
  }

  throw new Error('Cannot convert form state to processing: unknown type.');
};

const createProcessorGuardByType =
  <TProcessorType extends ProcessorType>(type: TProcessorType) =>
  (
    processor: ProcessorDefinitionWithUIAttributes
  ): processor is WithUIAttributes<
    Extract<ProcessorDefinition, { [K in TProcessorType]: unknown }>
  > =>
    processor.type === type;

export const isDateProcessor = createProcessorGuardByType('date');
export const isDissectProcessor = createProcessorGuardByType('dissect');
export const isManualIngestPipelineJsonProcessor =
  createProcessorGuardByType('manual_ingest_pipeline');
export const isGrokProcessor = createProcessorGuardByType('grok');

const createId = htmlIdGenerator();

const processorToUIDefinition = <TProcessorDefinition extends ProcessorDefinition>(
  processor: TProcessorDefinition
): ProcessorDefinitionWithUIAttributes => ({
  id: createId(),
  type: getProcessorType(processor),
  ...processor,
});

const processorToAPIDefinition = (
  processor: ProcessorDefinitionWithUIAttributes
): ProcessorDefinition => {
  const { id, type, ...processorConfig } = processor;
  return processorConfig;
};

const processorToSimulateDefinition = (
  processor: ProcessorDefinitionWithUIAttributes
): ProcessorDefinitionWithId => {
  const { type, ...processorConfig } = processor;
  return processorConfig;
};

export const processorConverter = {
  toAPIDefinition: processorToAPIDefinition,
  toSimulateDefinition: processorToSimulateDefinition,
  toUIDefinition: processorToUIDefinition,
};

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

export const getDefaultGrokProcessor = ({ sampleDocs }: { sampleDocs: FlattenRecord[] }) => ({
  grok: {
    field: getDefaultTextField(sampleDocs, PRIORITIZED_CONTENT_FIELDS),
    patterns: [''],
    pattern_definitions: {},
    ignore_failure: true,
    ignore_missing: true,
    if: ALWAYS_CONDITION,
  },
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

export const isValidProcessor = (processor: ProcessorDefinitionWithUIAttributes) =>
  isSchema(processorDefinitionSchema, processorConverter.toAPIDefinition(processor));
