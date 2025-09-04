/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import type { FlattenRecord } from '@kbn/streams-schema';
import { isSchema } from '@kbn/streams-schema';
import { htmlIdGenerator } from '@elastic/eui';
import { countBy, isEmpty, mapValues, omit, orderBy } from 'lodash';
import { DraftGrokExpression } from '@kbn/grok-ui';
import type { GrokProcessor, ProcessorType, StreamlangProcessorDefinition } from '@kbn/streamlang';
import { ALWAYS_CONDITION, streamlangProcessorSchema } from '@kbn/streamlang';
import type { EnrichmentDataSource } from '../../../../common/url_schema';
import type {
  DissectFormState,
  GrokFormState,
  ProcessorFormState,
  DateFormState,
  ManualIngestPipelineFormState,
  EnrichmentDataSourceWithUIAttributes,
  SetFormState,
} from './types';
import { configDrivenProcessors } from './processors/config_driven';
import type {
  ConfigDrivenProcessorType,
  ConfigDrivenProcessors,
} from './processors/config_driven/types';
import type { StreamEnrichmentContextType } from './state_management/stream_enrichment_state_machine/types';
import type { ProcessorResources } from './state_management/processor_state_machine';

/**
 * These are processor types with specialised UI. Other processor types are handled by a generic config-driven UI.
 */
export const SPECIALISED_TYPES = ['date', 'dissect', 'grok', 'set'];

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
  action: 'date',
  from: getDefaultTextField(sampleDocs, PRIORITIZED_DATE_FIELDS),
  formats: [],
  to: '',
  output_format: '',
  ignore_failure: true,
  where: ALWAYS_CONDITION,
});

const defaultDissectProcessorFormState = (sampleDocs: FlattenRecord[]): DissectFormState => ({
  action: 'dissect',
  from: getDefaultTextField(sampleDocs, PRIORITIZED_CONTENT_FIELDS),
  pattern: '',
  ignore_failure: true,
  ignore_missing: true,
  where: ALWAYS_CONDITION,
});

const defaultGrokProcessorFormState: (
  sampleDocs: FlattenRecord[],
  formStateDependencies: FormStateDependencies
) => GrokFormState = (
  sampleDocs: FlattenRecord[],
  formStateDependencies: FormStateDependencies
) => ({
  action: 'grok',
  from: getDefaultTextField(sampleDocs, PRIORITIZED_CONTENT_FIELDS),
  patterns: [new DraftGrokExpression(formStateDependencies.grokCollection, '')],
  ignore_failure: true,
  ignore_missing: true,
  where: ALWAYS_CONDITION,
});

const defaultManualIngestPipelineProcessorFormState = (): ManualIngestPipelineFormState => ({
  action: 'manual_ingest_pipeline',
  processors: [],
  ignore_failure: true,
  where: ALWAYS_CONDITION,
});

const defaultSetProcessorFormState = (): SetFormState => ({
  action: 'set' as const,
  to: '',
  value: '',
  ignore_failure: false,
  override: true,
  where: ALWAYS_CONDITION,
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
  set: defaultSetProcessorFormState,
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
  processor?: StreamlangProcessorDefinition
): ProcessorFormState => {
  if (!processor) return defaultGrokProcessorFormState(sampleDocuments, formStateDependencies);

  if (processor.action === 'grok') {
    const clone: GrokFormState = structuredClone({
      ...omit(processor, 'patterns'),
      patterns: [],
    });

    clone.patterns = processor.patterns.map(
      (pattern) => new DraftGrokExpression(formStateDependencies.grokCollection, pattern)
    );

    return clone;
  }

  if (
    processor.action === 'dissect' ||
    processor.action === 'manual_ingest_pipeline' ||
    processor.action === 'date' ||
    processor.action === 'set'
  ) {
    return structuredClone({
      ...processor,
    });
  }

  if (processor.action in configDrivenProcessors) {
    return configDrivenProcessors[
      processor.action as ConfigDrivenProcessorType
    ].convertProcessorToFormState(processor as any);
  }

  throw new Error(`Form state for processor type "${processor.action}" is not implemented.`);
};

export const convertFormStateToProcessor = (
  formState: ProcessorFormState
): {
  processorDefinition: StreamlangProcessorDefinition;
  processorResources?: ProcessorResources;
} => {
  if (formState.action === 'grok') {
    const { patterns, from, ignore_failure, ignore_missing } = formState;

    return {
      processorDefinition: {
        action: 'grok',
        where: formState.where,
        patterns: patterns
          .map((pattern) => pattern.getExpression().trim())
          .filter((pattern) => !isEmpty(pattern)),
        from,
        ignore_failure,
        ignore_missing,
      },
      processorResources: {
        grokExpressions: patterns,
      },
    };
  }

  if (formState.action === 'dissect') {
    const { from, pattern, append_separator, ignore_failure, ignore_missing } = formState;

    return {
      processorDefinition: {
        action: 'dissect',
        where: formState.where,
        from,
        pattern,
        append_separator: isEmpty(append_separator) ? undefined : append_separator,
        ignore_failure,
        ignore_missing,
      },
    };
  }

  if (formState.action === 'manual_ingest_pipeline') {
    const { processors, ignore_failure } = formState;

    return {
      processorDefinition: {
        action: 'manual_ingest_pipeline',
        where: formState.where,
        processors,
        ignore_failure,
      },
    };
  }

  if (formState.action === 'date') {
    const { from, formats, ignore_failure, to, output_format } = formState;

    return {
      processorDefinition: {
        action: 'date',
        where: formState.where,
        from,
        formats,
        ignore_failure,
        to: isEmpty(to) ? undefined : to,
        output_format: isEmpty(output_format) ? undefined : output_format,
      },
    };
  }

  if (formState.action === 'set') {
    const { to, value, copy_from, ignore_failure, override } = formState;

    const getValueOrCopyFrom = () => {
      if (typeof copy_from === 'string' && !isEmpty(copy_from)) {
        return { copy_from };
      }
      if (typeof value === 'string' && !isEmpty(value)) {
        return { value };
      }
      return { value: '' };
    };

    return {
      processorDefinition: {
        action: 'set',
        where: formState.where,
        to,
        ...getValueOrCopyFrom(),
        override,
        ignore_failure,
      },
    };
  }

  if (configDrivenProcessors[formState.action]) {
    return {
      processorDefinition: configDrivenProcessors[formState.action].convertFormStateToConfig(
        formState as any
      ),
    };
  }

  throw new Error('Cannot convert form state to processing: unknown type.');
};

const createProcessorGuardByType =
  <TProcessorType extends ProcessorType>(type: TProcessorType) =>
  (
    processor: StreamlangProcessorDefinition
  ): processor is Extract<StreamlangProcessorDefinition, { [K in TProcessorType]: unknown }> =>
    processor.action === type;

export const isDateProcessor = createProcessorGuardByType('date');
export const isDissectProcessor = createProcessorGuardByType('dissect');
export const isManualIngestPipelineJsonProcessor =
  createProcessorGuardByType('manual_ingest_pipeline');
export const isGrokProcessor = createProcessorGuardByType('grok');
export const isSetProcessor = createProcessorGuardByType('set');

const createId = htmlIdGenerator();

const processorToUIDefinition = <TProcessorDefinition extends StreamlangProcessorDefinition>(
  processor: TProcessorDefinition
): StreamlangProcessorDefinition => ({
  customIdentifier: createId(),
  ...processor,
});

const processorToAPIDefinition = (
  processor: StreamlangProcessorDefinition
): StreamlangProcessorDefinition => {
  // Remove customIdentifier, as we only use this for simulation tracing.
  const { customIdentifier, ...rest } = processor;
  return rest;
};

const processorToSimulateDefinition = (
  processor: StreamlangProcessorDefinition
): StreamlangProcessorDefinition => {
  return processor;
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

export const getDefaultGrokProcessor = ({
  sampleDocs,
}: {
  sampleDocs: FlattenRecord[];
}): GrokProcessor => ({
  action: 'grok',
  from: getDefaultTextField(sampleDocs, PRIORITIZED_CONTENT_FIELDS),
  patterns: [''],
  ignore_failure: true,
  ignore_missing: true,
  where: ALWAYS_CONDITION,
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

export const isValidProcessor = (processor: StreamlangProcessorDefinition) =>
  isSchema(streamlangProcessorSchema, processorConverter.toAPIDefinition(processor));
