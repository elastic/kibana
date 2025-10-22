/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipelineProcessor } from '../../../types/processors/ingest_pipeline_processors';

import type { StreamlangProcessorDefinition } from '../../../types/processors';
import { conditionToPainless } from '../../conditions/condition_to_painless';
import type { ActionToIngestType } from './processors/processor';
import { processorFieldRenames } from './processors/pre_processing';
import { processManualIngestPipelineProcessors } from './processors/manual_pipeline_processor';
import { applyPreProcessing, renameFields } from './processors/pre_processing';

import type { IngestPipelineTranspilationOptions } from '.';

export function convertStreamlangDSLActionsToIngestPipelineProcessors(
  actionSteps: StreamlangProcessorDefinition[],
  transpilationOptions?: IngestPipelineTranspilationOptions
): IngestProcessorContainer[] {
  return actionSteps.flatMap((actionStep) => {
    const renames = processorFieldRenames[actionStep.action] || {};
    const { action, ...rest } = actionStep;

    // Rename Streamlang to Ingest Processor specific fields
    const processorWithRenames = renameFields(
      rest,
      renames
    ) as ActionToIngestType[typeof actionStep.action];

    if ('customIdentifier' in processorWithRenames) {
      if (transpilationOptions?.traceCustomIdentifiers) {
        // If tracing custom identifiers, we can keep it as is
        processorWithRenames.tag = processorWithRenames.customIdentifier;
        delete processorWithRenames.customIdentifier;
      } else {
        // Otherwise, we remove it to avoid passing it to Elasticsearch
        delete processorWithRenames.customIdentifier;
      }
    }

    const processorWithCompiledConditions =
      'if' in processorWithRenames && processorWithRenames.if
        ? {
            ...processorWithRenames,
            if: conditionToPainless(processorWithRenames.if),
          }
        : processorWithRenames;

    if (action === 'manual_ingest_pipeline') {
      return processManualIngestPipelineProcessors(
        processorWithCompiledConditions as Parameters<
          typeof processManualIngestPipelineProcessors
        >[0],
        transpilationOptions
      );
    }

    return applyPreProcessing(action, processorWithCompiledConditions as IngestPipelineProcessor);
  });
}
