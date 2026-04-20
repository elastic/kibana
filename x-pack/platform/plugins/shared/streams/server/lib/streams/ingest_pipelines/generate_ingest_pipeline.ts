/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Streams,
  getParentId,
  isRoot,
  getRoot,
  LOGS_ROOT_STREAM_NAME,
  LOGS_OTEL_STREAM_NAME,
  LOGS_ECS_STREAM_NAME,
} from '@kbn/streams-schema';
import type {
  IngestPutPipelineRequest,
  IngestProcessorContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { transpileIngestPipeline } from '@kbn/streamlang';
import { createStreamlangResolverOptions } from '../resolvers';
import { ASSET_VERSION } from '../../../../common/constants';
import {
  getLogsOtelPipelineProcessors,
  getLogsEcsPipelineProcessors,
} from './logs_default_pipeline';
import { getProcessingPipelineName } from './name';

export async function generateIngestPipeline(
  name: string,
  definition: Streams.all.Definition,
  esClient: ElasticsearchClient
): Promise<IngestPutPipelineRequest> {
  const isWiredStream = Streams.WiredStream.Definition.is(definition);
  const rootStream = getRoot(definition.name);

  // Determine which processors to use based on root stream
  let rootProcessors: IngestProcessorContainer[] = [];
  if (isRoot(definition.name)) {
    switch (rootStream) {
      case LOGS_ECS_STREAM_NAME:
        rootProcessors = getLogsEcsPipelineProcessors();
        break;
      case LOGS_OTEL_STREAM_NAME:
      case LOGS_ROOT_STREAM_NAME:
        rootProcessors = getLogsOtelPipelineProcessors();
        break;
    }
  }

  return {
    id: getProcessingPipelineName(name),
    processors: [
      ...rootProcessors,
      ...(!isRoot(definition.name) && isWiredStream
        ? [
            {
              script: {
                source: `
                  if (ctx["stream.name"] != params.parentName) {
                    throw new IllegalArgumentException('stream.name is not set properly - did you send the document directly to a child stream instead of the main logs stream?');
                  }
                `,
                lang: 'painless',
                params: {
                  parentName: getParentId(definition.name),
                },
              },
            },
          ]
        : []),
      {
        script: {
          source: 'ctx["stream.name"] = params.field',
          lang: 'painless',
          params: {
            field: definition.name,
          },
        },
      },
      ...(isWiredStream
        ? (
            await transpileIngestPipeline(
              definition.ingest.processing,
              undefined,
              createStreamlangResolverOptions(esClient)
            )
          ).processors
        : []),
      {
        pipeline: {
          name: `${name}@stream.reroutes`,
          ignore_missing_pipeline: true,
        },
      },
    ],
    // root doesn't need flexible access pattern because it can't contain custom processing and default special case processing doesn't work properly with it
    ...(!isRoot(definition.name)
      ? {
          field_access_pattern: 'flexible',
        }
      : {}),
    _meta: {
      description: `Default pipeline for the ${name} stream`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}

export async function generateClassicIngestPipelineBody(
  definition: Streams.ingest.all.Definition,
  esClient: ElasticsearchClient
): Promise<Partial<IngestPutPipelineRequest>> {
  const transpiledIngestPipeline = await transpileIngestPipeline(
    definition.ingest.processing,
    undefined,
    createStreamlangResolverOptions(esClient)
  );
  return {
    processors: transpiledIngestPipeline.processors,
    _meta: {
      description: `Stream-managed pipeline for the ${definition.name} stream`,
      managed: true,
    },
    field_access_pattern: 'flexible',
    version: ASSET_VERSION,
  };
}
