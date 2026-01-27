/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, getParentId, isRoot } from '@kbn/streams-schema';
import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { transpileIngestPipeline } from '@kbn/streamlang';
import { ASSET_VERSION } from '../../../../common/constants';
import { getLogsDefaultPipelineProcessors } from './logs_default_pipeline';
import { getProcessingPipelineName } from './name';

export function generateIngestPipeline(
  name: string,
  definition: Streams.all.Definition
): IngestPutPipelineRequest {
  const isWiredStream = Streams.WiredStream.Definition.is(definition);
  return {
    id: getProcessingPipelineName(name),
    processors: [
      ...(isRoot(definition.name) ? getLogsDefaultPipelineProcessors() : []),
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
      ...(isWiredStream ? transpileIngestPipeline(definition.ingest.processing).processors : []),
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

export function generateClassicIngestPipelineBody(
  definition: Streams.ingest.all.Definition
): Partial<IngestPutPipelineRequest> {
  const transpiledIngestPipeline = transpileIngestPipeline(definition.ingest.processing);
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
