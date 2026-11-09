/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { Pipeline, Processor } from '@kbn/ingest-pipelines-plugin/common/types';
import type { ClassicFieldDefinition, FieldDefinition, Streams } from '@kbn/streams-schema';
import { Streams as StreamsRuntime } from '@kbn/streams-schema';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { getProcessingPipelineName, uiDefinitionToProcessors } from './ingest_pipeline_processors';
import type { PipelineProcessorsUiDefinition } from './types';

interface ProcessingPersistenceDeps {
  core: CoreStart;
  streamsRepositoryClient: StreamsRepositoryClient;
}

interface LoadProcessingInput {
  signal: AbortSignal;
}

export interface SaveProcessingInput {
  definition: Streams.ingest.all.GetResponse;
  pipeline: Pipeline;
  pipelineDefinition: PipelineProcessorsUiDefinition;
  fields?: FieldDefinition;
  signal?: AbortSignal | null;
}

export interface RequestPreview {
  method: 'POST' | 'PUT';
  url: string;
  body: unknown;
}

export interface ProcessingPersistenceAdapter {
  loadProcessing(input: LoadProcessingInput): Promise<{ pipeline: Pipeline }>;
  saveProcessing(input: SaveProcessingInput): Promise<Pipeline>;
  getProcessingRequestPreview(input: Omit<SaveProcessingInput, 'fields'>): Promise<RequestPreview>;
}

export interface LoadedProcessing {
  definition: Streams.ingest.all.GetResponse;
  pipeline: Pipeline;
  processingPersistenceAdapter: ProcessingPersistenceAdapter;
}

const createDestinationProcessingNotImplementedError = () =>
  new Error('Destination based processing persistence is not implemented yet.');

const getClassicPipelineFromDefinition = ({
  definition,
  destinationNodeName,
}: {
  definition: Streams.ClassicStream.GetResponse;
  destinationNodeName: string;
}): Pipeline => {
  const { processing } = definition.stream.ingest;

  if ('processors' in processing) {
    return {
      name: getProcessingPipelineName(destinationNodeName),
      processors: processing.processors as Processor[],
    };
  }

  return {
    name: getProcessingPipelineName(destinationNodeName),
    processors: [],
  };
};

const getPipelineRequest = async ({
  destinationNodeName,
  definition,
  pipeline,
  pipelineDefinition,
  fields,
}: SaveProcessingInput & {
  destinationNodeName: string;
}): Promise<{
  request: RequestPreview;
  nextPipeline: Pipeline;
  processors: Processor[];
}> => {
  const processors = (await uiDefinitionToProcessors(pipelineDefinition)) as Processor[];
  const { name } = pipeline;
  const nextPipeline: Pipeline = {
    name,
    processors,
  };

  if (!StreamsRuntime.ClassicStream.GetResponse.is(definition)) {
    throw createDestinationProcessingNotImplementedError();
  }

  return {
    request: {
      method: 'PUT',
      url: `/api/streams/${encodeURIComponent(destinationNodeName)}/_ingest`,
      body: {
        ingest: {
          ...definition.stream.ingest,
          processing: {
            processors,
          },
          classic: fields
            ? {
                ...definition.stream.ingest.classic,
                field_overrides: fields as ClassicFieldDefinition,
              }
            : definition.stream.ingest.classic,
        },
      },
    },
    nextPipeline,
    processors,
  };
};

const createClassicProcessingPersistenceAdapter = ({
  core,
  definition,
  destinationNodeName,
}: {
  core: CoreStart;
  definition: Streams.ClassicStream.GetResponse;
  destinationNodeName: string;
}): ProcessingPersistenceAdapter => {
  return {
    async loadProcessing() {
      return {
        pipeline: getClassicPipelineFromDefinition({
          definition,
          destinationNodeName,
        }),
      };
    },

    async saveProcessing(input) {
      const { request, nextPipeline } = await getPipelineRequest({
        ...input,
        destinationNodeName,
      });

      await core.http.put(request.url, {
        signal: input.signal ?? undefined,
        body: JSON.stringify(request.body),
      });

      return nextPipeline;
    },

    async getProcessingRequestPreview(input) {
      const { request } = await getPipelineRequest({
        ...input,
        fields: undefined,
        destinationNodeName,
      });

      return request;
    },
  };
};

const createDestinationProcessingPersistenceAdapter = (): ProcessingPersistenceAdapter => ({
  async loadProcessing() {
    throw createDestinationProcessingNotImplementedError();
  },
  async saveProcessing() {
    throw createDestinationProcessingNotImplementedError();
  },
  async getProcessingRequestPreview() {
    throw createDestinationProcessingNotImplementedError();
  },
});

export const createProcessingPersistenceAdapter = ({
  core,
  definition,
}: ProcessingPersistenceDeps & {
  definition: Streams.ingest.all.GetResponse;
}): ProcessingPersistenceAdapter => {
  if (StreamsRuntime.ClassicStream.GetResponse.is(definition)) {
    return createClassicProcessingPersistenceAdapter({
      core,
      definition,
      destinationNodeName: definition.stream.name,
    });
  }

  return createDestinationProcessingPersistenceAdapter();
};

export const loadProcessing = async ({
  core,
  streamsRepositoryClient,
  destinationNodeName,
  signal,
}: ProcessingPersistenceDeps & {
  destinationNodeName: string;
  signal: AbortSignal;
}): Promise<LoadedProcessing> => {
  const definition = await streamsRepositoryClient.fetch('GET /api/streams/{name} 2023-10-31', {
    signal,
    params: {
      path: { name: destinationNodeName },
    },
  });

  if (!StreamsRuntime.ingest.all.GetResponse.is(definition)) {
    throw new Error(`Stream ${destinationNodeName} is not an ingest stream`);
  }

  const processingPersistenceAdapter = createProcessingPersistenceAdapter({
    core,
    streamsRepositoryClient,
    definition,
  });
  const processing = await processingPersistenceAdapter.loadProcessing({ signal });

  return {
    definition,
    ...processing,
    processingPersistenceAdapter,
  };
};
