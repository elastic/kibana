/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { StreamsClient } from '../../../../lib/streams/client';
import { FAILURE_STORE_SELECTOR } from '../../../../../common/constants';
import { parseError } from '../../../../lib/streams/errors/parse_error';
import { simulateProcessing } from './simulation_handler';

const DEFAULT_SAMPLE_SIZE = 100;

/**
 * Structure of a document stored in the Elasticsearch failure store.
 * When a document fails ingestion, Elasticsearch wraps the original document
 * with metadata about the failure.
 */
interface FailureStoreDocument {
  '@timestamp': string;
  document: {
    id?: string;
    index?: string;
    source: FlattenRecord; // The original document that failed
  };
  error: {
    type?: string;
    message?: string;
    stack_trace?: string;
  };
}

export interface FailureStoreSamplesParams {
  path: {
    name: string;
  };
  query?: {
    size?: number;
    start?: string;
    end?: string;
  };
}

export interface FailureStoreSamplesDeps {
  params: FailureStoreSamplesParams;
  esClient: ElasticsearchClient;
  streamsClient: StreamsClient;
  fieldsMetadataClient: IFieldsMetadataClient;
}

export interface FailureStoreSamplesResponse {
  documents: FlattenRecord[];
}

/**
 * Fetches documents from the failure store and applies all configured processors
 * from parent streams to transform them.
 *
 * All failure store documents are returned regardless of when they failed, since
 * the simulation uses the current processing configuration. If processing has been
 * fixed since the failure, the simulation will succeed anyway.
 *
 * Optimizations:
 * - Direct children of root streams (e.g., logs.child) have no ancestor processing,
 *   so we skip fetching ancestors entirely.
 * - If the failure store is empty, we return early without fetching ancestors.
 * - Deeper nested streams (e.g., logs.child.grandchild) go through the full flow.
 */
export const getFailureStoreSamples = async ({
  params,
  esClient,
  streamsClient,
  fieldsMetadataClient,
}: FailureStoreSamplesDeps): Promise<FailureStoreSamplesResponse> => {
  const { name } = params.path;
  const size = params.query?.size ?? DEFAULT_SAMPLE_SIZE;
  const start = params.query?.start;
  const end = params.query?.end;

  // 1. Check if this is a direct child of a root stream (e.g., logs.child).
  // Direct children have no ancestor processing to apply, so we can optimize by
  // skipping ancestor retrieval entirely.
  if (isDirectChildOfRoot(name)) {
    const failureStoreDocs = await fetchFailureStoreDocuments({
      esClient,
      streamName: name,
      size,
      start,
      end,
    });
    return { documents: failureStoreDocs };
  }

  // 2. For deeper nested streams, first fetch failure store documents.
  // If no documents exist, we can return early without fetching ancestors.
  const failureStoreDocs = await fetchFailureStoreDocuments({
    esClient,
    streamName: name,
    size,
    start,
    end,
  });

  if (failureStoreDocs.length === 0) {
    return { documents: [] };
  }

  // 3. Only fetch ancestors when we have documents that need processing
  const ancestors = await streamsClient.getAncestors(name);

  // 4. Collect and combine processing steps from all ancestors (root to closest parent)
  const combinedProcessing = collectAncestorProcessing(ancestors);

  // If no processing steps are configured, return the raw documents
  if (combinedProcessing.steps.length === 0) {
    return { documents: failureStoreDocs };
  }

  // 5. Run simulation with combined processing using the existing simulateProcessing function
  const simulationResult = await simulateProcessing({
    params: {
      path: { name },
      body: {
        processing: combinedProcessing,
        documents: failureStoreDocs,
      },
    },
    esClient,
    streamsClient,
    fieldsMetadataClient,
  });

  // 6. Extract the processed document sources from the simulation result
  const processedDocs = simulationResult.documents.map((docReport) => docReport.value);

  return { documents: processedDocs };
};

/**
 * Checks if a stream is a direct child of a root stream (depth = 1).
 * Direct children (e.g., "logs.child") have no ancestors with processing to apply.
 * Root streams are identified by having no dots in their name.
 */
function isDirectChildOfRoot(streamName: string): boolean {
  const parts = streamName.split('.');
  // A direct child has exactly 2 parts: root.child
  return parts.length === 2;
}

/**
 * Fetches documents from the failure store for the given stream.
 *
 * Documents in the failure store are wrapped with error metadata. This function
 * unwraps them and returns only the original document sources that can be used
 * for simulation.
 *
 * Optionally filters by time range if start/end are provided.
 */
async function fetchFailureStoreDocuments({
  esClient,
  streamName,
  size,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  streamName: string;
  size: number;
  start?: string;
  end?: string;
}): Promise<FlattenRecord[]> {
  try {
    // Build query with optional time range filter
    const query =
      start || end
        ? {
            bool: {
              must: [
                {
                  range: {
                    '@timestamp': {
                      ...(start && { gte: start }),
                      ...(end && { lte: end }),
                    },
                  },
                },
              ],
            },
          }
        : undefined;

    const response = await esClient.search({
      index: `${streamName}${FAILURE_STORE_SELECTOR}`,
      size,
      sort: [{ '@timestamp': { order: 'desc' } }],
      ...(query && { query }),
    });

    // Unwrap the original documents from the failure store wrapper.
    // Failure store documents have the structure: { document: { source: <original doc> }, error: {...} }
    // We want to return just the original document so users can fix their processing
    // for newly incoming docs that will have the same structure.
    return response.hits.hits
      .map((hit) => {
        const failureDoc = hit._source as FailureStoreDocument | undefined;
        return failureDoc?.document?.source;
      })
      .filter((doc): doc is FlattenRecord => doc !== undefined);
  } catch (error) {
    // If the failure store doesn't exist or is empty, return empty array
    const { statusCode } = parseError(error);
    if (statusCode === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Collects and combines processing steps from all ancestors in order from root to closest parent.
 * This brings failure store documents to the state they would be in when entering the current
 * stream's pipeline, so the simulation can accurately show what the current stream's processors
 * do to them.
 *
 * The current stream's own processors are intentionally excluded — those are what the UI simulation
 * will run, and pre-applying them here would cause docs to appear already-parsed and then fail
 * the simulation on a second pass.
 */
export function collectAncestorProcessing(
  ancestors: Streams.WiredStream.Definition[]
): StreamlangDSL {
  const allSteps: StreamlangDSL['steps'] = [];

  // Sort ancestors from root (shortest name) to closest parent
  const sortedAncestors = [...ancestors].sort((a, b) => a.name.length - b.name.length);

  // Add processing steps from each ancestor only
  for (const ancestor of sortedAncestors) {
    if (ancestor.ingest.processing.steps.length > 0) {
      allSteps.push(...ancestor.ingest.processing.steps);
    }
  }

  return { steps: allSteps };
}
