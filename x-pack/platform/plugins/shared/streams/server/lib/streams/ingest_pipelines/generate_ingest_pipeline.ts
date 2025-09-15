/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, getParentId, isRoot } from '@kbn/streams-schema';
import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { ASSET_VERSION } from '../../../../common/constants';
import { getLogsDefaultPipelineProcessors } from './logs_default_pipeline';
import { getProcessingPipelineName } from './name';
import { formatToIngestProcessors } from '../helpers/processing';

export function generateIngestPipeline(
  name: string,
  definition: Streams.all.Definition,
  {
    isServerless,
  }: {
    isServerless: boolean;
  }
): IngestPutPipelineRequest {
  const isWiredStream = Streams.WiredStream.Definition.is(definition);
  return {
    id: getProcessingPipelineName(name),
    processors: [
      ...(isRoot(definition.name) ? getLogsDefaultPipelineProcessors(isServerless) : []),
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
      ...((isWiredStream && formatToIngestProcessors(definition.ingest.processing)) || []),
      {
        pipeline: {
          name: `${name}@stream.reroutes`,
          ignore_missing_pipeline: true,
        },
      },
    ],
    _meta: {
      description: `Default pipeline for the ${name} stream`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}

export function generateClassicIngestPipelineBody(definition: Streams.ingest.all.Definition) {
  return {
    processors: formatToIngestProcessors(definition.ingest.processing),
    _meta: {
      description: `Stream-managed pipeline for the ${definition.name} stream`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}
