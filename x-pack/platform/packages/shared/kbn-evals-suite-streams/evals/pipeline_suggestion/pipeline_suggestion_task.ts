/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/scout';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { ProcessingSimulationResponse, FlattenRecord } from '@kbn/streams-schema';
import { findSSEEventData } from '../shared_helpers';
import type {
  PipelineSuggestionEvaluationExample,
  PipelineSuggestionGroundTruth,
} from './pipeline_suggestion_datasets';
import {
  calculatePipelineSuggestionMetrics,
  type PipelineSuggestionMetrics,
} from './pipeline_suggestion_metrics';

export interface PipelineSuggestionResult {
  input: PipelineSuggestionEvaluationExample['input'];
  output: {
    suggestedPipeline: StreamlangDSL | null;
    simulationResult: ProcessingSimulationResponse;
    metrics: PipelineSuggestionMetrics;
  };
  expected: PipelineSuggestionEvaluationExample['output'];
  metadata: PipelineSuggestionEvaluationExample['metadata'];
}

/**
 * Flatten nested objects into dot notation.
 * E.g., { attributes: { filepath: 'Apache.log' } } => { 'attributes.filepath': 'Apache.log' }
 */
const flattenObject = (obj: Record<string, unknown>, prefix = ''): FlattenRecord => {
  const flattened: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened as FlattenRecord;
};

const fetchSampleDocuments = async (
  esClient: Client,
  streamName: string,
  count: number
): Promise<FlattenRecord[]> => {
  const response = await esClient.search({
    index: streamName,
    size: count,
    sort: [{ '@timestamp': { order: 'desc' } }],
  });

  const hits = response.hits?.hits || [];
  return hits.map(
    (hit) => flattenObject((hit._source ?? {}) as Record<string, unknown>) as FlattenRecord
  );
};

/**
 * Prepare sample documents from either inline data or by fetching from ES.
 */
const prepareSampleDocuments = async (
  input: PipelineSuggestionEvaluationExample['input'],
  esClient: Client
): Promise<FlattenRecord[]> => {
  if (input.sample_documents && input.sample_documents.length > 0) {
    return input.sample_documents.map((doc) => {
      const flattened = flattenObject(doc);
      // Replace stream.name with the target stream name to avoid constant_keyword conflicts
      if (flattened['stream.name']) {
        flattened['stream.name'] = input.stream_name;
      }
      return flattened;
    });
  }

  if (input.sample_document_count) {
    const documents = await fetchSampleDocuments(
      esClient,
      input.stream_name,
      input.sample_document_count
    );

    if (!documents || documents.length === 0) {
      const parentDocs = await fetchSampleDocuments(esClient, 'logs.otel', 10);
      const sampleFilepaths = parentDocs
        .slice(0, 5)
        .map((doc) => doc['attributes.filepath'])
        .filter(Boolean);

      throw new Error(
        `No documents found in stream ${input.stream_name}. ` +
          `Parent stream 'logs.otel' has ${parentDocs.length} documents. ` +
          `Sample filepaths: ${sampleFilepaths.join(', ')}. ` +
          `Expected filepath: ${input.system}.log`
      );
    }

    if (documents.length < input.sample_document_count) {
      throw new Error(
        `Stream ${input.stream_name} returned ${documents.length} documents; ` +
          `sample_document_count is ${input.sample_document_count}. Re-run synthtrace seeding with higher rpm or a longer time window.`
      );
    }

    return documents;
  }

  throw new Error(`Example must provide either sample_documents or sample_document_count`);
};

/**
 * Call the pipeline suggestion API and parse the SSE response.
 */
const suggestPipeline = async (
  kbnClient: KbnClient,
  streamName: string,
  connectorId: string,
  documents: FlattenRecord[]
): Promise<{ pipeline: StreamlangDSL | null; rawResponse: string }> => {
  const response = await kbnClient.request({
    method: 'POST',
    path: `/internal/streams/${streamName}/_suggest_processing_pipeline`,
    body: {
      connector_id: connectorId,
      documents,
    },
  });

  const rawResponse = response.data as string;
  const data = findSSEEventData<{ pipeline: StreamlangDSL }>(
    rawResponse,
    'suggested_processing_pipeline'
  );

  return { pipeline: data?.pipeline ?? null, rawResponse };
};

/**
 * Run the simulation API against a suggested pipeline.
 */
const simulatePipeline = async (
  kbnClient: KbnClient,
  streamName: string,
  documents: FlattenRecord[],
  pipeline: StreamlangDSL
): Promise<ProcessingSimulationResponse> => {
  const response = await kbnClient.request({
    method: 'POST',
    path: `/internal/streams/${streamName}/processing/_simulate`,
    body: { documents, processing: pipeline },
  });

  return response.data as ProcessingSimulationResponse;
};

const EMPTY_SIMULATION: ProcessingSimulationResponse = {
  documents: [],
  processors_metrics: {},
  documents_metrics: {
    failed_rate: 0,
    partially_parsed_rate: 0,
    skipped_rate: 0,
    parsed_rate: 1,
    dropped_rate: 0,
  },
  detected_fields: [],
  definition_error: undefined,
};

/**
 * Build a result for the case where no pipeline was returned (or expected).
 * Returns the result object when the outcome matches expectations, or throws
 * when a pipeline was expected but missing.
 */
const buildEmptyPipelineResult = (
  input: PipelineSuggestionEvaluationExample['input'],
  expected: PipelineSuggestionGroundTruth,
  metadata: PipelineSuggestionEvaluationExample['metadata'],
  {
    suggestedPipeline,
    rawResponse,
    documents,
    expectsNoPipeline,
  }: {
    suggestedPipeline: StreamlangDSL | null;
    rawResponse: string;
    documents: FlattenRecord[];
    expectsNoPipeline: boolean;
  }
): PipelineSuggestionResult => {
  if (expectsNoPipeline) {
    const perfectMetrics: PipelineSuggestionMetrics = {
      parseRate: 1,
      fieldCount: 0,
      processorCount: 0,
      processorTypes: {},
      processorFailureRates: {},
      otelCompliance: 1,
      semanticFieldCoverage: 1,
      typeCorrectness: 1,
      stepCount: 0,
      stepEfficiency: 1,
      hasRedundantProcessors: false,
      overallQuality: 1,
    };

    return {
      input,
      output: {
        suggestedPipeline: null,
        simulationResult: EMPTY_SIMULATION,
        metrics: perfectMetrics,
      },
      expected,
      metadata,
    };
  }

  const responsePreview = rawResponse.slice(0, 1000);
  const bodyPreview = (documents[0]?.['body.text'] as string | undefined)?.slice(0, 200);

  throw new Error(
    `Pipeline suggestion returned null/empty for ${input.stream_name}. ` +
      `Response preview: ${responsePreview}. ` +
      `Sample document body.text: ${bodyPreview}. ` +
      `Document count: ${documents.length}`
  );
};

/**
 * Build a result for when a pipeline was returned but none was expected.
 */
const buildUnexpectedPipelineResult = (
  input: PipelineSuggestionEvaluationExample['input'],
  expected: PipelineSuggestionGroundTruth,
  metadata: PipelineSuggestionEvaluationExample['metadata'],
  suggestedPipeline: StreamlangDSL
): PipelineSuggestionResult => {
  const poorMetrics: PipelineSuggestionMetrics = {
    parseRate: 0,
    fieldCount: 0,
    processorCount: suggestedPipeline.steps?.length ?? 0,
    processorTypes: {},
    processorFailureRates: {},
    otelCompliance: 0,
    semanticFieldCoverage: 0,
    typeCorrectness: 0,
    stepCount: suggestedPipeline.steps?.length ?? 0,
    stepEfficiency: 0,
    hasRedundantProcessors: true,
    overallQuality: 0,
  };

  const failedSimulation: ProcessingSimulationResponse = {
    ...EMPTY_SIMULATION,
    documents_metrics: {
      failed_rate: 1,
      partially_parsed_rate: 0,
      skipped_rate: 0,
      parsed_rate: 0,
      dropped_rate: 0,
    },
  };

  return {
    input,
    output: {
      suggestedPipeline,
      simulationResult: failedSimulation,
      metrics: poorMetrics,
    },
    expected,
    metadata,
  };
};

/**
 * End-to-end task: prepare documents, suggest a pipeline, simulate it, and
 * calculate quality metrics.
 */
export const runPipelineSuggestion = async (
  example: PipelineSuggestionEvaluationExample,
  kbnClient: KbnClient,
  esClient: Client,
  connector: { id: string }
): Promise<PipelineSuggestionResult> => {
  const { input, output: expected, metadata } = example;

  try {
    const documents = await prepareSampleDocuments(input, esClient);
    const { pipeline: suggestedPipeline, rawResponse } = await suggestPipeline(
      kbnClient,
      input.stream_name,
      connector.id,
      documents
    );

    const expectsNoPipeline =
      expected.expected_processors.parsing === undefined &&
      (expected.expected_processors.normalization?.length ?? 0) === 0;

    const isEmptyPipeline = !suggestedPipeline || (suggestedPipeline.steps?.length ?? 0) === 0;

    if (isEmptyPipeline) {
      return buildEmptyPipelineResult(input, expected, metadata, {
        suggestedPipeline,
        rawResponse,
        documents,
        expectsNoPipeline,
      });
    }

    if (expectsNoPipeline) {
      return buildUnexpectedPipelineResult(input, expected, metadata, suggestedPipeline);
    }

    const simulationResult = await simulatePipeline(
      kbnClient,
      input.stream_name,
      documents,
      suggestedPipeline
    );

    const metrics = calculatePipelineSuggestionMetrics(
      suggestedPipeline,
      simulationResult,
      expected
    );

    return {
      input,
      output: { suggestedPipeline, simulationResult, metrics },
      expected,
      metadata,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in runPipelineSuggestion:', error);
    throw error;
  }
};
