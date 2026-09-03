/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { isComputedFeature, isFeatureWithFilter } from '@kbn/significant-events-schema';
import {
  DEFAULT_INFERENCE_DOCUMENT_LIMITS,
  formatRawDocument,
  type InferenceDocument,
} from '@kbn/streams-ai';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { fetchSampleDocuments } from './fetch_sample_documents';

// Caps the sample at ~100K tokens.
export const MAX_INFERENCE_DOCUMENTS_BYTES = 288 * 1024;
export const MAX_INFERENCE_DOCUMENT_BYTES = DEFAULT_INFERENCE_DOCUMENT_LIMITS.maxDocumentBytes;
export const MAX_INFERENCE_DOCUMENT_FIELDS = DEFAULT_INFERENCE_DOCUMENT_LIMITS.maxFields;
export const MAX_INFERENCE_FIELD_NAME_LENGTH = DEFAULT_INFERENCE_DOCUMENT_LIMITS.maxFieldNameLength;

// The formatter strips `resource.attributes.` / `attributes.` prefixes when matching, so
// `service.name` also covers `resource.attributes.service.name`.
const INFERENCE_PRIORITY_FIELDS: readonly string[] = [
  'message',
  'body.text',
  'error.message',
  'exception.message',
  'error.stack_trace',
  'exception.stacktrace',
  'error.type',
  'exception.type',
  'log.level',
  'severity_text',
  'severity_number',
  'service.name',
  '@timestamp',
];

export interface PrepareInferredSamplingResult {
  hasDocuments: boolean;
  documents: InferenceDocument[];
  docsCount: number;
  docIds: string[];
  samplingTelemetry: {
    totalFilters: number;
    filtersCapped: boolean;
    hasFilteredDocuments: boolean;
  };
}

const compactDocuments = (hits: Array<SearchHit<Record<string, unknown>>>): InferenceDocument[] => {
  const documents: InferenceDocument[] = [];
  let serializedBytes = 2;

  for (const hit of hits) {
    const document = formatRawDocument({ hit, priorityFields: INFERENCE_PRIORITY_FIELDS });
    if (!document) {
      continue;
    }
    const documentBytes = Buffer.byteLength(JSON.stringify(document), 'utf8');
    const nextSerializedBytes = serializedBytes + documentBytes + (documents.length > 0 ? 1 : 0);
    if (nextSerializedBytes > MAX_INFERENCE_DOCUMENTS_BYTES) {
      continue;
    }
    documents.push(document);
    serializedBytes = nextSerializedBytes;
  }

  return documents;
};

export const prepareInferredSampling = async ({
  esClient,
  kiClient,
  streamName,
  samplingSource,
  start,
  end,
  runId,
  logger,
  sampleSize,
  entityFilteredRatio,
  diverseRatio,
  maxEntityFilters,
  iteration,
  samplingTimeoutMs,
}: {
  esClient: ElasticsearchClient;
  kiClient: Pick<KnowledgeIndicatorClient, 'getFeatures'>;
  streamName: string;
  samplingSource: string;
  start: number;
  end: number;
  runId: string;
  logger: Logger;
  sampleSize: number;
  entityFilteredRatio: number;
  diverseRatio: number;
  maxEntityFilters: number;
  iteration: number;
  samplingTimeoutMs: number;
}): Promise<PrepareInferredSamplingResult> => {
  const { hits: allFeatures } = await kiClient.getFeatures(streamName);
  const discoveredFeatures = allFeatures.filter(
    (feature) => !isComputedFeature(feature) && feature.run_id === runId
  );

  const {
    documents: sampledDocuments,
    totalFilters,
    filtersCapped,
    hasFilteredDocuments,
  } = await fetchSampleDocuments({
    esClient,
    index: samplingSource,
    start,
    end,
    features: discoveredFeatures.filter(isFeatureWithFilter),
    logger,
    size: sampleSize,
    entityFilteredRatio,
    diverseRatio,
    maxEntityFilters,
    iteration,
    samplingTimeoutMs,
  });
  const documents = compactDocuments(sampledDocuments);

  return {
    hasDocuments: documents.length > 0,
    documents,
    docsCount: documents.length,
    docIds: documents.map(({ _id }) => _id).filter((id): id is string => id !== undefined),
    samplingTelemetry: {
      totalFilters,
      filtersCapped,
      hasFilteredDocuments,
    },
  };
};
