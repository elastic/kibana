/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipelineProcessor } from '../../../types/processors/ingest_pipeline_processors';
import {
  getStreamlangResolverForProcessor,
  type StreamlangResolverOptions,
} from '../../../types/resolvers';

import type { StreamlangProcessorDefinition } from '../../../types/processors';
import { conditionToPainless } from '../../conditions/condition_to_painless';
import { processManualIngestPipelineProcessors } from './processors/manual_pipeline_processor';
import { processMathProcessor } from './processors/math_processor';
import {
  applyPreProcessing,
  processorFieldRenames,
  renameFields,
} from './processors/pre_processing';
import type { ActionToIngestType } from './processors/processor';
import { processRemoveByPrefixProcessor } from './processors/remove_by_prefix_processor';

import type { IngestPipelineTranspilationOptions } from '.';
import { processConcatProcessor } from './processors/concat_processor';
import { processSortProcessor } from './processors/sort_processor';
import { processJsonExtractProcessor } from './processors/json_extract_processor';
import { processEnrichProcessor } from './processors/enrich_processor';
import { processJoinProcessor } from './processors/join_processor';

export async function convertStreamlangDSLActionsToIngestPipelineProcessors(
  actionSteps: StreamlangProcessorDefinition[],
  transpilationOptions?: IngestPipelineTranspilationOptions,
  resolverOptions?: StreamlangResolverOptions
): Promise<IngestProcessorContainer[]> {
  const processors = actionSteps.flatMap((actionStep) => {
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

    // manual_ingest_pipeline handles its own condition compilation because it needs to
    // combine the parent 'where' condition with nested processor 'if' conditions
    if (action === 'manual_ingest_pipeline') {
      return processManualIngestPipelineProcessors(
        processorWithRenames as Parameters<typeof processManualIngestPipelineProcessors>[0],
        transpilationOptions
      );
    }

    const processorWithCompiledConditions =
      'if' in processorWithRenames && processorWithRenames.if
        ? {
            ...processorWithRenames,
            if: conditionToPainless(processorWithRenames.if),
          }
        : processorWithRenames;

    if (action === 'remove_by_prefix') {
      return processRemoveByPrefixProcessor(
        processorWithCompiledConditions as Parameters<typeof processRemoveByPrefixProcessor>[0]
      );
    }

    if (action === 'math') {
      // Math processor outputs a script processor
      return [
        processMathProcessor(
          processorWithCompiledConditions as Parameters<typeof processMathProcessor>[0]
        ),
      ];
    }

    if (action === 'join') {
      return processJoinProcessor(
        processorWithCompiledConditions as Parameters<typeof processJoinProcessor>[0]
      );
    }

    if (action === 'concat') {
      return processConcatProcessor(
        processorWithCompiledConditions as Parameters<typeof processConcatProcessor>[0]
      );
    }

    if (action === 'sort') {
      return processSortProcessor(
        processorWithCompiledConditions as Parameters<typeof processSortProcessor>[0]
      );
    }

    if (action === 'json_extract') {
      return [
        processJsonExtractProcessor(
          processorWithCompiledConditions as Parameters<typeof processJsonExtractProcessor>[0]
        ),
      ];
    }

    if (action === 'enrich') {
      const resolver = getStreamlangResolverForProcessor(actionStep, resolverOptions);
      if (!resolver) {
        throw new Error('Enrich processor requires an enrich policy resolver.');
      }
      return processEnrichProcessor(
        processorWithCompiledConditions as Parameters<typeof processEnrichProcessor>[0],
        resolver
      );
    }

    return applyPreProcessing(action, processorWithCompiledConditions as IngestPipelineProcessor);
  });

  return Promise.all(processors);
}
