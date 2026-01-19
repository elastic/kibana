/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestProcessorContainer,
  IngestSimulateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { FlattenRecord } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import { transpileIngestPipeline } from '@kbn/streamlang';
import type { StreamsClient } from '../../../../lib/streams/client';
import { FAILURE_STORE_SELECTOR } from '../../../../../common/constants';

const DEFAULT_SAMPLE_SIZE = 100;

export interface FailureStoreSamplesParams {
  path: {
    name: string;
  };
  query?: {
    size?: number;
    start?: number;
    end?: number;
  };
}

export interface FailureStoreSamplesDeps {
  params: FailureStoreSamplesParams;
  scopedClusterClient: IScopedClusterClient;
  streamsClient: StreamsClient;
}

export interface FailureStoreSamplesResponse {
  documents: FlattenRecord[];
}

/**
 * Fetches documents from the failure store and applies all configured processors
 * from parent streams to transform them.
 */
export const getFailureStoreSamples = async ({
  params,
  scopedClusterClient,
  streamsClient,
}: FailureStoreSamplesDeps): Promise<FailureStoreSamplesResponse> => {
  const { name } = params.path;
  const size = params.query?.size ?? DEFAULT_SAMPLE_SIZE;
  const start = params.query?.start;
  const end = params.query?.end;

  // 1. Get the stream definition and its ancestors
  const [stream, ancestors] = await Promise.all([
    streamsClient.getStream(name),
    streamsClient.getAncestors(name),
  ]);

  // 2. Fetch documents from the failure store
  const failureStoreDocs = await fetchFailureStoreDocuments({
    scopedClusterClient,
    streamName: name,
    size,
    start,
    end,
  });

  if (failureStoreDocs.length === 0) {
    return { documents: [] };
  }

  // 3. Collect and combine processing steps from all ancestors (root to current stream)
  const combinedProcessors = collectAncestorProcessors(ancestors, stream);

  // If no processors are configured, return the raw documents
  if (combinedProcessors.length === 0) {
    return { documents: failureStoreDocs };
  }

  // 4. Run simulation with combined processors
  const processedDocs = await simulateWithProcessors({
    scopedClusterClient,
    documents: failureStoreDocs,
    processors: combinedProcessors,
    streamName: name,
  });

  return { documents: processedDocs };
};

/**
 * Fetches documents from the failure store for the given stream.
 */
async function fetchFailureStoreDocuments({
  scopedClusterClient,
  streamName,
  size,
  start,
  end,
}: {
  scopedClusterClient: IScopedClusterClient;
  streamName: string;
  size: number;
  start?: number;
  end?: number;
}): Promise<FlattenRecord[]> {
  const timeRangeFilter =
    start && end
      ? {
          range: {
            '@timestamp': {
              gte: start,
              lte: end,
            },
          },
        }
      : undefined;

  try {
    const response = await scopedClusterClient.asCurrentUser.search({
      index: `${streamName}${FAILURE_STORE_SELECTOR}`,
      size,
      sort: [{ '@timestamp': { order: 'desc' } }],
      ...(timeRangeFilter && {
        query: {
          bool: {
            filter: [timeRangeFilter],
          },
        },
      }),
    });

    return response.hits.hits.map((hit) => hit._source as FlattenRecord);
  } catch (error) {
    // If the failure store doesn't exist or is empty, return empty array
    if (error.meta?.statusCode === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Collects and combines processing steps from all ancestors in order from root to current stream.
 * This ensures processors are applied in the correct order as they would be during normal ingestion.
 */
function collectAncestorProcessors(
  ancestors: Streams.WiredStream.Definition[],
  currentStream: Streams.all.Definition
): IngestProcessorContainer[] {
  const allProcessors: IngestProcessorContainer[] = [];

  // Sort ancestors from root (shortest name) to closest parent
  const sortedAncestors = [...ancestors].sort((a, b) => a.name.length - b.name.length);

  // Add processors from each ancestor
  for (const ancestor of sortedAncestors) {
    if (ancestor.ingest.processing.steps.length > 0) {
      const transpiledProcessors = transpileIngestPipeline(ancestor.ingest.processing).processors;
      allProcessors.push(...transpiledProcessors);
    }
  }

  // Add processors from the current stream if it's a wired or classic stream with processing
  if (Streams.WiredStream.Definition.is(currentStream)) {
    if (currentStream.ingest.processing.steps.length > 0) {
      const transpiledProcessors = transpileIngestPipeline(
        currentStream.ingest.processing
      ).processors;
      allProcessors.push(...transpiledProcessors);
    }
  } else if (Streams.ClassicStream.Definition.is(currentStream)) {
    if (currentStream.ingest.processing.steps.length > 0) {
      const transpiledProcessors = transpileIngestPipeline(
        currentStream.ingest.processing
      ).processors;
      allProcessors.push(...transpiledProcessors);
    }
  }

  return allProcessors;
}

/**
 * Runs the ingest pipeline simulation with the given processors on the documents.
 */
async function simulateWithProcessors({
  scopedClusterClient,
  documents,
  processors,
  streamName,
}: {
  scopedClusterClient: IScopedClusterClient;
  documents: FlattenRecord[];
  processors: IngestProcessorContainer[];
  streamName: string;
}): Promise<FlattenRecord[]> {
  const simulationBody: IngestSimulateRequest = {
    docs: documents.map((doc, index) => ({
      _index: streamName,
      _id: index.toString(),
      _source: doc,
    })),
    pipeline: {
      processors,
    },
  };

  const simulationResult = await scopedClusterClient.asCurrentUser.ingest.simulate(simulationBody);

  // Extract the processed documents from the simulation result
  return simulationResult.docs.map((docResult) => {
    if ('doc' in docResult && docResult.doc?._source) {
      return docResult.doc._source as FlattenRecord;
    }
    // If simulation failed for this doc, return the original
    return documents[parseInt(docResult.doc?._id ?? '0', 10)] ?? {};
  });
}
