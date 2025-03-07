/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import {
  ProcessorDefinition,
  ProcessorDefinitionWithId,
  ProcessorType,
  getProcessorType,
} from '@kbn/streams-schema';
import { htmlIdGenerator } from '@elastic/eui';
import { isEmpty } from 'lodash';
import {
  DissectFormState,
  ProcessorDefinitionWithUIAttributes,
  GrokFormState,
  ProcessorFormState,
  WithUIAttributes,
} from './types';
import { ALWAYS_CONDITION } from '../../../util/condition';

const defaultGrokProcessorFormState: GrokFormState = {
  type: 'grok',
  field: 'body.text',
  patterns: [{ value: '' }],
  pattern_definitions: {},
  ignore_failure: true,
  ignore_missing: true,
  if: ALWAYS_CONDITION,
};

const defaultDissectProcessorFormState: DissectFormState = {
  type: 'dissect',
  field: 'body.text',
  pattern: '',
  ignore_failure: true,
  ignore_missing: true,
  if: ALWAYS_CONDITION,
};

const defaultProcessorFormStateByType: Record<ProcessorType, ProcessorFormState> = {
  dissect: defaultDissectProcessorFormState,
  grok: defaultGrokProcessorFormState,
};

export const getDefaultFormStateByType = (type: ProcessorType) =>
  defaultProcessorFormStateByType[type];

export const getFormStateFrom = (
  processor?: ProcessorDefinitionWithUIAttributes
): ProcessorFormState => {
  if (!processor) return defaultGrokProcessorFormState;

  if (isGrokProcessor(processor)) {
    const { grok } = processor;

    return structuredClone({
      ...grok,
      type: 'grok',
      patterns: grok.patterns.map((pattern) => ({ value: pattern })),
    });
  }

  if (isDissectProcessor(processor)) {
    const { dissect } = processor;

    return structuredClone({
      ...dissect,
      type: 'dissect',
    });
  }

  throw new Error(`Form state for processor type "${processor.type}" is not implemented.`);
};

export const convertFormStateToProcessor = (formState: ProcessorFormState): ProcessorDefinition => {
  if (formState.type === 'grok') {
    const { patterns, field, pattern_definitions, ignore_failure, ignore_missing } = formState;

    return {
      grok: {
        if: formState.if,
        patterns: patterns.filter(({ value }) => value.trim().length > 0).map(({ value }) => value),
        field,
        pattern_definitions,
        ignore_failure,
        ignore_missing,
      },
    };
  }

  if (formState.type === 'dissect') {
    const { field, pattern, append_separator, ignore_failure, ignore_missing } = formState;

    return {
      dissect: {
        if: formState.if,
        field,
        pattern,
        append_separator: isEmpty(append_separator) ? undefined : append_separator,
        ignore_failure,
        ignore_missing,
      },
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

export const isGrokProcessor = createProcessorGuardByType('grok');
export const isDissectProcessor = createProcessorGuardByType('dissect');

const createId = htmlIdGenerator();
const toUIDefinition = <TProcessorDefinition extends ProcessorDefinition>(
  processor: TProcessorDefinition
): ProcessorDefinitionWithUIAttributes => ({
  id: createId(),
  type: getProcessorType(processor),
  ...processor,
});

const toAPIDefinition = (processor: ProcessorDefinitionWithUIAttributes): ProcessorDefinition => {
  const { id, type, ...processorConfig } = processor;
  return processorConfig;
};

const toSimulateDefinition = (
  processor: ProcessorDefinitionWithUIAttributes
): ProcessorDefinitionWithId => {
  const { type, ...processorConfig } = processor;
  return processorConfig;
};

export const processorConverter = {
  toAPIDefinition,
  toSimulateDefinition,
  toUIDefinition,
};
