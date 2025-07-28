/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALWAYS_CONDITION, ManualIngestPipelineProcessor, StreamlangDSL } from '@kbn/streamlang';
import { Streams } from '@kbn/streams-schema';
import { BaseStream } from '@kbn/streams-schema/src/models/base';

export function migrateOnRead(definition: Record<string, unknown>): Streams.all.Definition {
  let migratedDefinition = definition;
  if (typeof definition.description !== 'string') {
    migratedDefinition = {
      ...definition,
      description: '',
    };
  }

  if (
    migratedDefinition.ingest &&
    typeof migratedDefinition.ingest === 'object' &&
    Array.isArray((migratedDefinition.ingest as { processing?: unknown }).processing)
  ) {
    migratedDefinition = migrateOldProcessingArrayToStreamlang(migratedDefinition);
  }

  Streams.all.Definition.asserts(migratedDefinition as unknown as BaseStream.Definition);

  return migratedDefinition as unknown as Streams.all.Definition;
}

// TODO: Verify this properly / write tests
const migrateOldProcessingArrayToStreamlang = (definition: Record<string, unknown>) => {
  const oldProcessing =
    typeof definition.ingest === 'object' &&
    definition.ingest !== null &&
    'processing' in definition.ingest
      ? (definition.ingest as { processing?: unknown }).processing
      : undefined;

  // Arrays to collect manual_ingest_pipeline processors and others
  const manualIngestPipelineProcessors: ManualIngestPipelineProcessor[] = [];
  const otherProcessors: any[] = [];

  if (Array.isArray(oldProcessing)) {
    oldProcessing.forEach((proc) => {
      if (
        proc &&
        typeof proc === 'object' &&
        'manual_ingest_pipeline' in proc &&
        Array.isArray((proc as any).manual_ingest_pipeline?.processors)
      ) {
        const streamlangManualIngestPipeline: ManualIngestPipelineProcessor = {
          action: 'manual_ingest_pipeline',
          processors: (proc as any).manual_ingest_pipeline.processors,
          description: (proc as any).manual_ingest_pipeline.description,
          ignore_failure: (proc as any).manual_ingest_pipeline.ignore_failure,
          where: (proc as any).manual_ingest_pipeline.if,
          tag: (proc as any).manual_ingest_pipeline.tag,
          on_failure: (proc as any).on_failure,
        };
        // Use manual_ingest_pipeline processor as is once converted to Streamlang
        manualIngestPipelineProcessors.push(streamlangManualIngestPipeline);
      } else if (proc) {
        // Collect other processor types
        otherProcessors.push(proc);
      }
    });

    // If there are any other processors, merge them into a single manual_ingest_pipeline processor
    if (otherProcessors.length > 0) {
      const streamlangManualIngestPipeline: ManualIngestPipelineProcessor = {
        action: 'manual_ingest_pipeline',
        processors: otherProcessors,
        ignore_failure: true,
        where: ALWAYS_CONDITION,
      };

      manualIngestPipelineProcessors.push(streamlangManualIngestPipeline);
    }
  }

  // Convert to StreamlangDSL steps
  const newProcessing: StreamlangDSL = {
    steps: manualIngestPipelineProcessors,
  };

  return {
    ...definition,
    ingest: {
      ...(typeof definition.ingest === 'object' && definition.ingest !== null
        ? definition.ingest
        : {}),
      processing: newProcessing,
    },
  };
};
