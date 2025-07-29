/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  ElasticsearchProcessorType,
  elasticsearchProcessorTypes,
} from '../../../types/processors/manual_ingest_pipeline_processors';
import {
  IngestPipelineGrokProcessor,
  IngestPipelineDissectProcessor,
  IngestPipelineDateProcessor,
  IngestPipelineRenameProcessor,
  IngestPipelineSetProcessor,
  IngestPipelineManualIngestPipelineProcessor,
  IngestPipelineAppendProcessor,
} from '../../../types/processors/ingest_pipeline_processors';
import { StreamlangProcessorDefinition } from '../../../types/processors';
import { conditionToPainless } from '../../conditions/condition_to_painless';
import type { IngestPipelineTranspilationOptions } from '.';

interface ActionToIngestType {
  grok: IngestPipelineGrokProcessor;
  dissect: IngestPipelineDissectProcessor;
  date: IngestPipelineDateProcessor;
  rename: IngestPipelineRenameProcessor;
  set: IngestPipelineSetProcessor;
  append: IngestPipelineAppendProcessor;
  manual_ingest_pipeline: IngestPipelineManualIngestPipelineProcessor;
}

const processorFieldRenames: Record<string, Record<string, string>> = {
  grok: { from: 'field', where: 'if' },
  dissect: { from: 'field', where: 'if' },
  date: { from: 'field', to: 'target_field', where: 'if' },
  rename: { from: 'field', to: 'target_field', where: 'if' },
  set: { to: 'field', where: 'if' },
  append: { to: 'field', where: 'if' },
  manual_ingest_pipeline: { where: 'if' },
};

function renameFields<T extends Record<string, any>>(obj: T, renames: Record<string, string>): T {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = renames[key] || key;
      result[newKey] = obj[key];
    }
  }
  return result as T;
}

export function convertStreamlangDSLActionsToIngestPipelineProcessors(
  actionSteps: StreamlangProcessorDefinition[],
  transpilationOptions?: IngestPipelineTranspilationOptions
): IngestProcessorContainer[] {
  return actionSteps.flatMap((actionStep) => {
    const renames = processorFieldRenames[actionStep.action] || {};
    const { action, ...rest } = actionStep;
    const processorWithRenames = renameFields(
      rest,
      renames
    ) as ActionToIngestType[typeof actionStep.action];
    const processorWithCompiledConditions =
      'if' in processorWithRenames && processorWithRenames.if
        ? {
            ...processorWithRenames,
            if: conditionToPainless(processorWithRenames.if),
          }
        : processorWithRenames;

    if (action === 'manual_ingest_pipeline') {
      return processManualIngestPipelineProcessors(
        processorWithCompiledConditions as IngestPipelineManualIngestPipelineProcessor,
        transpilationOptions
      );
    }

    return [
      {
        [action]: {
          ...processorWithCompiledConditions,
        },
      },
    ];
  });
}

const processManualIngestPipelineProcessors = (
  manualIngestPipelineProcessor: IngestPipelineManualIngestPipelineProcessor,
  transpilationOptions?: IngestPipelineTranspilationOptions
) => {
  // manual_ingest_pipeline processor is a special case, since it has nested Elasticsearch-level processors and doesn't support if
  // directly - we need to add it to each nested processor
  return manualIngestPipelineProcessor.processors.flatMap((nestedProcessor) => {
    const nestedType = Object.keys(nestedProcessor)[0];
    if (!elasticsearchProcessorTypes.includes(nestedType as ElasticsearchProcessorType)) {
      if (transpilationOptions?.ignoreMalformed) {
        return [];
      }
      throw new Error(
        `Invalid processor type "${nestedType}" in manual_ingest_pipeline processor. Supported types: ${elasticsearchProcessorTypes.join(
          ', '
        )}`
      );
    }
    const nestedConfig = nestedProcessor[nestedType as ElasticsearchProcessorType] as Record<
      string,
      unknown
    >;
    if (typeof nestedConfig !== 'object' || nestedConfig === null) {
      if (transpilationOptions?.ignoreMalformed) {
        return [];
      }
      throw new Error(
        `Invalid processor config for "${nestedType}" in manual_ingest_pipeline processor. Expected an object.`
      );
    }
    return {
      [nestedType]: {
        ...nestedConfig,
        tag: manualIngestPipelineProcessor.tag ?? nestedConfig.tag,
        ignore_failure: nestedConfig.ignore_failure ?? manualIngestPipelineProcessor.ignore_failure,
        on_failure: nestedConfig.on_failure
          ? [
              ...(nestedConfig.on_failure as []),
              ...(manualIngestPipelineProcessor.on_failure || []),
            ]
          : manualIngestPipelineProcessor.on_failure,
        ...(!nestedConfig.if &&
        'if' in manualIngestPipelineProcessor &&
        manualIngestPipelineProcessor.if
          ? { if: manualIngestPipelineProcessor.if }
          : {}),
      },
    } as IngestProcessorContainer;
  });
};
