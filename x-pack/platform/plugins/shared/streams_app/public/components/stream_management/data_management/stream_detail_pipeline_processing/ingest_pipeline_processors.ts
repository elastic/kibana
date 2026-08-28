/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestProcessorContainer,
  IngestRegisteredDomainProcessor,
} from '@elastic/elasticsearch/lib/api/types';
import {
  getGeneratedProcessorStepId,
  isGeneratedProcessorStepId,
} from '@kbn/ingest-pipeline-json-editor';
import type {
  PipelineProcessorDefinition,
  PipelineProcessorDefinitionWithUIAttributes,
  PipelineProcessorsUiDefinition,
} from './types';
import { isPipelineProcessorStep } from './types';

export const getProcessingPipelineName = (streamName: string) => `${streamName}@stream.processing`;

const processorBaseToStep = (
  processorConfig: Record<string, unknown>,
  processorIndex: number
): {
  customIdentifier: string;
  parentId: null;
  description?: string;
  ignore_failure?: boolean;
  tag?: string;
} => {
  const { tag, description, ignore_failure: ignoreFailure } = processorConfig;
  const userProvidedTag =
    typeof tag === 'string' && tag.length > 0 && !isGeneratedProcessorStepId(tag) ? tag : undefined;

  return {
    customIdentifier: userProvidedTag ?? getGeneratedProcessorStepId(processorIndex),
    parentId: null,
    description: typeof description === 'string' ? description : undefined,
    ignore_failure: typeof ignoreFailure === 'boolean' ? ignoreFailure : undefined,
    tag: userProvidedTag,
  };
};

const toEditableProcessorStep = (
  processor: NonNullable<IngestProcessorContainer>,
  index: number
): PipelineProcessorDefinitionWithUIAttributes => {
  const [processorType] = Object.keys(processor);
  const processorConfig = (processor as Record<string, Record<string, unknown>>)[processorType];

  if (!processorType || !processorConfig) {
    throw new Error('Cannot render ingest processor without a processor type.');
  }

  const { field, tag: _tag, description: _description, ...rest } = processorConfig;
  const base = processorBaseToStep(processorConfig, index);

  switch (processorType) {
    case 'set':
      return {
        action: 'set',
        ...base,
        field: typeof field === 'string' ? field : '',
        ...rest,
      } as PipelineProcessorDefinitionWithUIAttributes;
    case 'gsub':
      return {
        action: 'gsub',
        ...base,
        field: typeof field === 'string' ? field : '',
        ...rest,
      } as PipelineProcessorDefinitionWithUIAttributes;
    case 'append':
      return {
        action: 'append',
        ...base,
        field: typeof field === 'string' ? field : '',
        ...rest,
      } as PipelineProcessorDefinitionWithUIAttributes;
    case 'grok':
    case 'dissect':
    case 'redact':
      return {
        action: processorType,
        ...base,
        field: typeof field === 'string' ? field : '',
        ...rest,
      } as PipelineProcessorDefinitionWithUIAttributes;
    case 'remove':
      return {
        action: 'remove',
        ...base,
        field: typeof field === 'string' || Array.isArray(field) ? field : '',
        ...rest,
      } as PipelineProcessorDefinitionWithUIAttributes;
    case 'date':
    case 'convert':
    case 'rename':
    case 'uppercase':
    case 'lowercase':
    case 'trim':
    case 'split':
    case 'sort':
    case 'uri_parts':
    case 'user_agent':
      return {
        action: processorType,
        ...base,
        field: typeof field === 'string' ? field : '',
        ...rest,
      } as PipelineProcessorDefinitionWithUIAttributes;
    case 'join':
      return {
        action: processorType,
        ...base,
        field: typeof field === 'string' ? field : '',
        ...rest,
      } as PipelineProcessorDefinitionWithUIAttributes;
    case 'drop':
      return {
        action: 'drop',
        ...base,
        ...rest,
      } as PipelineProcessorDefinitionWithUIAttributes;
    case 'enrich':
      return {
        action: 'enrich',
        ...base,
        field: typeof field === 'string' ? field : '',
        ...rest,
      } as PipelineProcessorDefinitionWithUIAttributes;
    case 'network_direction':
      return {
        action: processorType,
        ...base,
        ...rest,
      } as PipelineProcessorDefinitionWithUIAttributes;
    case 'registered_domain':
      return {
        action: 'registered_domain',
        ...base,
        expression: typeof field === 'string' ? field : '',
        prefix: typeof rest.target_field === 'string' ? rest.target_field : 'domain',
        ignore_missing: rest.ignore_missing,
        ignore_failure: rest.ignore_failure,
      } as PipelineProcessorDefinitionWithUIAttributes;
    default:
      throw new Error(`Cannot render unsupported ingest processor type "${processorType}".`);
  }
};

const nativeProcessorActions = new Set([
  'append',
  'convert',
  'date',
  'dissect',
  'drop',
  'enrich',
  'gsub',
  'grok',
  'join',
  'lowercase',
  'network_direction',
  'redact',
  'registered_domain',
  'remove',
  'rename',
  'set',
  'sort',
  'split',
  'trim',
  'uppercase',
  'uri_parts',
  'user_agent',
]);

export const isSerializableProcessorStep = (step: { action: unknown }): boolean => {
  return typeof step.action === 'string' && nativeProcessorActions.has(step.action);
};

const removeUndefinedValues = (record: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));

export interface UiDefinitionToProcessorsOptions {
  includeGeneratedTags?: boolean;
}

const processorStepToNativeProcessor = (
  step: PipelineProcessorDefinition,
  options: UiDefinitionToProcessorsOptions = {}
): IngestProcessorContainer | undefined => {
  if (!isSerializableProcessorStep(step)) {
    return undefined;
  }

  const {
    action,
    customIdentifier,
    tag,
    description,
    ignore_failure: ignoreFailure,
    parentId: _parentId,
    branch: _branch,
    ...rest
  } = step;
  if (typeof action !== 'string') {
    return undefined;
  }
  const userProvidedTag =
    typeof tag === 'string' && tag.length > 0 && !isGeneratedProcessorStepId(tag) ? tag : undefined;
  const generatedTag =
    options.includeGeneratedTags && typeof customIdentifier === 'string'
      ? customIdentifier
      : undefined;
  const config: Record<string, unknown> = {
    ...rest,
    tag: userProvidedTag ?? generatedTag,
    description,
    ignore_failure: ignoreFailure,
  };

  if (action === 'registered_domain') {
    const { expression, prefix, ...registeredDomainConfig } = config;
    const processorConfig = removeUndefinedValues({
      ...registeredDomainConfig,
      field: expression,
      target_field: prefix,
    }) as unknown as IngestRegisteredDomainProcessor;
    return {
      registered_domain: processorConfig,
    };
  }

  if (Array.isArray(config.patterns)) {
    config.patterns = config.patterns
      .map((pattern) =>
        typeof pattern === 'object' && pattern !== null && 'value' in pattern
          ? (pattern as { value?: unknown }).value
          : pattern
      )
      .filter((pattern) => typeof pattern !== 'string' || pattern.trim() !== '');
  }

  if (Array.isArray(config.internal_networks)) {
    config.internal_networks = config.internal_networks.map((internalNetwork) =>
      typeof internalNetwork === 'object' && internalNetwork !== null && 'value' in internalNetwork
        ? (internalNetwork as { value?: unknown }).value
        : internalNetwork
    );
  }

  return {
    [action]: removeUndefinedValues(config),
  } as IngestProcessorContainer;
};

export const processorsToUiDefinition = (
  processors: IngestProcessorContainer[]
): PipelineProcessorsUiDefinition => {
  if (processors.length === 0) {
    return { steps: [] };
  }

  return {
    steps: processors
      .filter((processor): processor is NonNullable<IngestProcessorContainer> => Boolean(processor))
      .map(toEditableProcessorStep),
  };
};

export const uiDefinitionToProcessors = (
  uiDefinition: PipelineProcessorsUiDefinition,
  options: UiDefinitionToProcessorsOptions = {}
): Array<NonNullable<IngestProcessorContainer>> => {
  return uiDefinition.steps
    .flatMap((step) => {
      if (!isPipelineProcessorStep(step)) {
        return [];
      }
      const nativeProcessor = processorStepToNativeProcessor(step, options);
      if (!nativeProcessor) {
        throw new Error(
          `Cannot serialize processor action "${step.action}" to an ingest processor.`
        );
      }

      return [nativeProcessor];
    })
    .filter((processor): processor is NonNullable<IngestProcessorContainer> => Boolean(processor));
};
