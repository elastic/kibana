/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipelineManualIngestPipelineProcessor } from '../../../../types/processors/ingest_pipeline_processors';
import {
  type ElasticsearchProcessorType,
  elasticsearchProcessorTypes,
} from '../../../../types/processors/manual_ingest_pipeline_processors';
import type { IngestPipelineTranspilationOptions } from '..';

export const processManualIngestPipelineProcessors = (
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
