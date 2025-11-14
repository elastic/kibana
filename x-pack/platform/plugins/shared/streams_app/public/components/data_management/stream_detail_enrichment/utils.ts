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
import type {
  ConvertProcessor,
  GrokProcessor,
  ProcessorType,
  ReplaceProcessor,
  StreamlangProcessorDefinition,
  StreamlangProcessorDefinitionWithUIAttributes,
  StreamlangStepWithUIAttributes,
  StreamlangWhereBlockWithUIAttributes,
} from '@kbn/streamlang';
import {
  ALWAYS_CONDITION,
  conditionSchema,
  convertStepToUIDefinition,
  streamlangProcessorSchema,
} from '@kbn/streamlang';
import { isWhereBlock } from '@kbn/streamlang/types/streamlang';
import type { EnrichmentDataSource } from '../../../../common/url_schema';
import type {
  DissectFormState,
  GrokFormState,
  ProcessorFormState,
  DateFormState,
  ManualIngestPipelineFormState,
  EnrichmentDataSourceWithUIAttributes,
  ReplaceFormState,
  SetFormState,
  WhereBlockFormState,
  ConvertFormState,
  DropFormState,
} from './types';
import { configDrivenProcessors } from './steps/blocks/action/config_driven';
import type {
  ConfigDrivenProcessorType,
  ConfigDrivenProcessors,
} from './steps/blocks/action/config_driven/types';
import type { StreamEnrichmentContextType } from './state_management/stream_enrichment_state_machine/types';
import type { ProcessorResources } from './state_management/steps_state_machine';

/**
 * These are processor types with specialised UI. Other processor types are handled by a generic config-driven UI.
 */
export const SPECIALISED_TYPES = ['convert', 'date', 'dissect', 'grok', 'set', 'replace'];

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
  'custom.timestamp',
  'attributes.custom.timestamp',
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

const defaultConvertProcessorFormState = (): ConvertFormState => ({
  action: 'convert' as const,
  from: '',
  to: '',
  type: 'string',
  ignore_failure: true,
  ignore_missing: true,
  where: ALWAYS_CONDITION,
});

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

const defaultDropProcessorFormState = (): DropFormState => ({
  action: 'drop_document',
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

const defaultReplaceProcessorFormState = (): ReplaceFormState => ({
  action: 'replace' as const,
  from: '',
  pattern: '',
  replacement: '',
  ignore_missing: true,
  ignore_failure: true,
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
  convert: defaultConvertProcessorFormState,
  date: defaultDateProcessorFormState,
  dissect: defaultDissectProcessorFormState,
  drop_document: defaultDropProcessorFormState,
  grok: defaultGrokProcessorFormState,
  manual_ingest_pipeline: defaultManualIngestPipelineProcessorFormState,
  replace: defaultReplaceProcessorFormState,
  set: defaultSetProcessorFormState,
  ...configDrivenDefaultFormStates,
};

export const getDefaultFormStateByType = (
  type: ProcessorType,
  sampleDocuments: FlattenRecord[],
  formStateDependencies: FormStateDependencies
) => defaultProcessorFormStateByType[type](sampleDocuments, formStateDependencies);

export const getFormStateFromActionStep = (
  sampleDocuments: FlattenRecord[],
  formStateDependencies: FormStateDependencies,
  step?: StreamlangProcessorDefinitionWithUIAttributes
): ProcessorFormState => {
  if (!step) return defaultGrokProcessorFormState(sampleDocuments, formStateDependencies);

  if (step.action === 'grok') {
    const { customIdentifier, parentId, ...restStep } = step;

    const clone: GrokFormState = structuredClone({
      ...omit(restStep, 'patterns'),
      patterns: [],
    });

    clone.patterns = step.patterns.map(
      (pattern) => new DraftGrokExpression(formStateDependencies.grokCollection, pattern)
    );

    return clone;
  }

  if (
    step.action === 'dissect' ||
    step.action === 'manual_ingest_pipeline' ||
    step.action === 'date' ||
    step.action === 'drop_document' ||
    step.action === 'set' ||
    step.action === 'convert' ||
    step.action === 'replace'
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
    ].convertProcessorToFormState(restStep as any);
  }

  throw new Error(`Form state for processor type "${step.action}" is not implemented.`);
};

export const getFormStateFromWhereStep = (
  step: StreamlangWhereBlockWithUIAttributes
): WhereBlockFormState => {
  return structuredClone({
    ...step,
  });
};

export const convertWhereBlockFormStateToConfiguration = (
  formState: WhereBlockFormState
): {
  whereDefinition: StreamlangWhereBlockWithUIAttributes;
} => {
  return {
    whereDefinition: {
      ...formState,
    },
  };
};

export const convertFormStateToProcessor = (
  formState: ProcessorFormState
): {
  processorDefinition: StreamlangProcessorDefinition;
  processorResources?: ProcessorResources;
} => {
  if ('action' in formState) {
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
      const { from, formats, ignore_failure, to, output_format, timezone, locale } = formState;

      return {
        processorDefinition: {
          action: 'date',
          where: formState.where,
          from,
          formats,
          ignore_failure,
          to: isEmpty(to) ? undefined : to,
          output_format: isEmpty(output_format) ? undefined : output_format,
          timezone: isEmpty(timezone) ? undefined : timezone,
          locale: isEmpty(locale) ? undefined : locale,
        },
      };
    }

    if (formState.action === 'drop_document') {
      return {
        processorDefinition: {
          action: 'drop_document',
          where: formState.where,
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

    if (formState.action === 'convert') {
      const { from, type, to, ignore_failure, ignore_missing } = formState;

      return {
        processorDefinition: {
          action: 'convert',
          from,
          type,
          to: isEmpty(to) ? undefined : to,
          ignore_failure,
          ignore_missing,
          where: 'where' in formState ? formState.where : undefined,
        } as ConvertProcessor,
      };
    }

    if (formState.action === 'replace') {
      const { from, pattern, replacement, to, ignore_failure, ignore_missing } = formState;

      return {
        processorDefinition: {
          action: 'replace',
          from: isEmpty(from) ? '' : from,
          pattern: isEmpty(pattern) ? '' : pattern,
          replacement: isEmpty(replacement) ? '' : replacement,
          to: isEmpty(to) ? undefined : to,
          ignore_failure,
          ignore_missing,
          where: 'where' in formState ? formState.where : undefined,
        } as ReplaceProcessor,
      };
    }

    if (configDrivenProcessors[formState.action]) {
      return {
        processorDefinition: configDrivenProcessors[formState.action].convertFormStateToConfig(
          formState as any
        ),
      };
    }
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

export const stepConverter = {
  toUIDefinition: convertStepToUIDefinition,
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

// Get valid steps for simulation
// This will return valid action blocks, and valid where blocks, where
// where blocks are invalid all their children are also skipped.
export const getValidSteps = (
  steps: StreamlangStepWithUIAttributes[]
): StreamlangStepWithUIAttributes[] => {
  const validSteps: StreamlangStepWithUIAttributes[] = [];

  // Helper to recursively skip invalid where blocks and their children
  function processStep(step: StreamlangStepWithUIAttributes): boolean {
    if (isWhereBlock(step)) {
      // If the where block is invalid, skip it and all its children
      if (!isSchema(conditionSchema, step.where)) {
        return false;
      }

      // Valid but has no children (compilation of this step would be pointless)
      const hasChildren = steps.some((s) => s.parentId === step.customIdentifier);
      if (!hasChildren) {
        return false;
      }

      // Valid where block with children
      validSteps.push(step);
      return true;
    } else {
      // Action step: check validity
      if (isSchema(streamlangProcessorSchema, step)) {
        validSteps.push(step);
        return true;
      }
      return false;
    }
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
    if (isWhereBlock(step) && !isValid) {
      skipParentIds.add(step.customIdentifier);
    }
  }
  return validSteps;
};

export const getStepPanelColour = (stepIndex: number) => {
  const isEven = stepIndex % 2 === 0;
  return isEven ? 'subdued' : undefined;
};
