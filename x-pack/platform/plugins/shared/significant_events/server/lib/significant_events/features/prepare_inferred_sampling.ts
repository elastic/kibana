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
import { formatRawDocument, type InferenceDocument } from '@kbn/streams-ai';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';
import { fetchSampleDocuments } from './fetch_sample_documents';

export const MAX_INFERENCE_DOCUMENTS_BYTES = 768 * 1024;
export const MAX_INFERENCE_DOCUMENT_BYTES = 32 * 1024;
const MAX_INFERENCE_DOCUMENT_FIELDS = 100;
const MAX_INFERENCE_STRING_LENGTH = 8 * 1024;
const MAX_NESTED_OBJECT_ENTRIES = 100;
const MAX_NESTED_DEPTH = 5;
const MAX_ARRAY_ITEMS = 3;
const MAX_TAG_ITEMS = 100;

export interface PrepareInferredSamplingResult {
  hasDocuments: boolean;
  documents: InferenceDocument[];
  docsCount: number;
  docIds: string[];
  totalFilters: number;
  filtersCapped: boolean;
  hasFilteredDocuments: boolean;
}

const truncateValue = (value: unknown, key: string, depth = 0): unknown => {
  if (typeof value === 'string') {
    return value.length > MAX_INFERENCE_STRING_LENGTH
      ? `${value.slice(0, MAX_INFERENCE_STRING_LENGTH)}…`
      : value;
  }

  if (Array.isArray(value)) {
    const maxItems = key.includes('tags') ? MAX_TAG_ITEMS : MAX_ARRAY_ITEMS;
    return value.slice(0, maxItems).map((item) => truncateValue(item, key, depth + 1));
  }

  if (value && typeof value === 'object') {
    if (depth >= MAX_NESTED_DEPTH) {
      return '[nested value omitted]';
    }
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, MAX_NESTED_OBJECT_ENTRIES)
        .map(([nestedKey, nestedValue]) => [
          nestedKey,
          truncateValue(nestedValue, nestedKey, depth + 1),
        ])
    );
  }

  return value;
};

const compactDocument = (
  hit: SearchHit<Record<string, unknown>>
): InferenceDocument | undefined => {
  const formatted = formatRawDocument({
    hit,
    shouldNotTruncate: (key) => key.includes('tags'),
  });
  if (!formatted) {
    return undefined;
  }

  const compacted: InferenceDocument = { _id: formatted._id, fields: {} };
  for (const [key, value] of Object.entries(formatted.fields).slice(
    0,
    MAX_INFERENCE_DOCUMENT_FIELDS
  )) {
    const fields = { ...compacted.fields, [key]: truncateValue(value, key) };
    if (
      Buffer.byteLength(JSON.stringify({ ...compacted, fields }), 'utf8') <=
      MAX_INFERENCE_DOCUMENT_BYTES
    ) {
      compacted.fields = fields;
    }
  }

  return Object.keys(compacted.fields).length > 0 ? compacted : undefined;
};

const compactDocuments = (hits: Array<SearchHit<Record<string, unknown>>>): InferenceDocument[] => {
  const documents: InferenceDocument[] = [];
  let serializedBytes = 2;

  for (const hit of hits) {
    const document = compactDocument(hit);
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
    totalFilters,
    filtersCapped,
    hasFilteredDocuments,
  };
};
