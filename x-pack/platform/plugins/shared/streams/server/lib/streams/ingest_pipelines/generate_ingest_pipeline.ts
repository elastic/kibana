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

// Painless guard skipping a processor when an upstream execution layer has
// already applied the same processing. Cloud Pipelines' streamlang-runtime
// stamps `attributes._streamlang_processed = true` on every record it has
// finished processing+routing. Records arriving via the OTel path therefore
// bypass the per-stream user processing and the reroutes pipeline (which
// the runtime has already done in-stream); records arriving via /_bulk
// without that marker continue to flow through the ingest pipeline as
// before, preserving the "ingest pipeline as backup" property.
const STREAMLANG_PROCESSED_GUARD = 'ctx.attributes?._streamlang_processed != true';

const gateProcessor = (proc: IngestProcessorContainer, guard: string): IngestProcessorContainer => {
  // Each processor container has exactly one type-named key whose value is
  // the processor config. Add/AND the `if` clause on that inner config.
  // Painless `if` accepts either an expression OR a script (with `return`).
  // When the existing `if` is in script form, expression-style `&&`
  // composition is invalid — combine in script form instead.
  const [type, configRaw] = Object.entries(proc)[0] as [
    string,
    Record<string, unknown> | undefined
  ];
  const config = configRaw ?? {};
  const existingIf = typeof config.if === 'string' ? (config.if as string).trim() : '';
  let combined: string;
  if (!existingIf) {
    combined = guard;
  } else if (/\breturn\b/.test(existingIf)) {
    combined = `if (!(${guard})) { return false; } ${existingIf}`;
  } else {
    combined = `(${existingIf}) && (${guard})`;
  }
  return { [type]: { ...config, if: combined } } as IngestProcessorContainer;
};

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
          ).processors.map((p) => gateProcessor(p, STREAMLANG_PROCESSED_GUARD))
        : []),
      gateProcessor(
        {
          pipeline: {
            name: `${name}@stream.reroutes`,
            ignore_missing_pipeline: true,
          },
        },
        STREAMLANG_PROCESSED_GUARD
      ),
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
