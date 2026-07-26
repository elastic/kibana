/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Streams } from '@kbn/streams-schema';
import type { ProcessingSimulationResponse } from '@kbn/streams-schema';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { SimulationFeedback } from './build_simulation_feedback';
import {
  pipelineDefinitionSchema,
  postParsePipelineDefinitionSchema,
  suggestProcessingPipeline,
} from '.';

jest.mock('@kbn/inference-prompt-utils', () => ({
  executeAsReasoningAgent: jest.fn(),
}));

import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';

const mockExecuteAsReasoningAgent = executeAsReasoningAgent as jest.MockedFunction<
  typeof executeAsReasoningAgent
>;

const emptyDocumentsMetrics: ProcessingSimulationResponse['documents_metrics'] = {
  parsed_rate: 1,
  failed_rate: 0,
  partially_parsed_rate: 0,
  skipped_rate: 0,
  dropped_rate: 0,
};

function createSuccessfulSimulation(overrides: Partial<ProcessingSimulationResponse> = {}) {
  const base: ProcessingSimulationResponse = {
    documents: [
      {
        value: { message: 'ok' },
        errors: [],
        detected_fields: [],
        status: 'parsed',
        processed_by: [],
      },
    ],
    detected_fields: [],
    processors_metrics: {},
    definition_error: undefined,
    documents_metrics: { ...emptyDocumentsMetrics },
  };
  return { ...base, ...overrides };
}

const STUB_INITIAL_DATASET_JSON = JSON.stringify({
  document_count: 1,
  fields: [],
});

const createIngestDefinition = (): Streams.ClassicStream.Definition => ({
  type: 'classic',
  name: 'logs-test-default',
  description: 'Test',
  updated_at: '2024-01-01T00:00:00Z',
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: '2024-01-01T00:00:00Z' },
    settings: {},
    classic: { field_overrides: undefined },
    failure_store: { inherit: {} },
  },
});

async function invokeSimulateCallback(toolCallbacks: Record<string, Function>, pipeline: object) {
  const simCallback = toolCallbacks.simulate_pipeline;
  const toolResult = await simCallback({
    toolCallId: 't1',
    function: {
      name: 'simulate_pipeline',
      arguments: { pipeline },
    },
  });
  return toolResult.response as SimulationFeedback;
}

describe('suggestProcessingPipeline workflow', () => {
  const mockEsClient = {
    fieldCaps: jest.fn().mockResolvedValue({ fields: {} }),
  } as unknown as ElasticsearchClient;

  const mockFieldsMetadataClient = {
    find: jest.fn().mockResolvedValue({
      getFields: () => ({}),
    }),
  } as unknown as IFieldsMetadataClient;

  const mockInferenceClient = {} as BoundInferenceClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call simulatePipeline before the agent runs (overview JSON from caller)', async () => {
    const simulatePipeline = jest
      .fn()
      .mockImplementation(() => Promise.resolve(createSuccessfulSimulation()));

    mockExecuteAsReasoningAgent.mockResolvedValue({
      content: '',
      toolCalls: [
        {
          toolCallId: 'c1',
          function: {
            name: 'commit_pipeline',
            arguments: { pipeline: { steps: [] } },
          },
        },
      ],
      input: [{ role: MessageRole.Assistant, content: '', toolCalls: [] }],
    });

    await suggestProcessingPipeline({
      definition: createIngestDefinition(),
      inferenceClient: mockInferenceClient,
      agentPipelineSchema: postParsePipelineDefinitionSchema,
      maxSteps: 2,
      signal: new AbortController().signal,
      simulatePipeline,
      documents: [{ message: 'hello' }],
      fieldsMetadataClient: mockFieldsMetadataClient,
      esClient: mockEsClient,
      initialDatasetAnalysisJson: STUB_INITIAL_DATASET_JSON,
      mappedFields: {},
    });

    expect(simulatePipeline).not.toHaveBeenCalled();
  });

  it('passes upstream extraction context to the reasoning agent when provided', async () => {
    const simulatePipeline = jest
      .fn()
      .mockImplementation(() => Promise.resolve(createSuccessfulSimulation()));

    mockExecuteAsReasoningAgent.mockResolvedValue({
      content: '',
      toolCalls: [
        {
          toolCallId: 'c1',
          function: {
            name: 'commit_pipeline',
            arguments: { pipeline: { steps: [] } },
          },
        },
      ],
      input: [{ role: MessageRole.Assistant, content: '', toolCalls: [] }],
    });

    await suggestProcessingPipeline({
      definition: createIngestDefinition(),
      inferenceClient: mockInferenceClient,
      agentPipelineSchema: postParsePipelineDefinitionSchema,
      maxSteps: 2,
      signal: new AbortController().signal,
      simulatePipeline,
      documents: [{ message: 'hello' }],
      fieldsMetadataClient: mockFieldsMetadataClient,
      esClient: mockEsClient,
      initialDatasetAnalysisJson: STUB_INITIAL_DATASET_JSON,
      mappedFields: {},
      upstreamSeedParsingContextMarkdown: 'UPSTREAM_MARKDOWN_BLOCK',
    });

    expect(mockExecuteAsReasoningAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          upstream_extraction_context: 'UPSTREAM_MARKDOWN_BLOCK',
        }),
      })
    );
  });

  it('returns only agent-committed steps (orchestrator merges seed parsing separately)', async () => {
    const simulatePipeline = jest
      .fn()
      .mockImplementation(() => Promise.resolve(createSuccessfulSimulation()));

    const dateStep: StreamlangDSL = {
      steps: [
        {
          action: 'date',
          from: '@timestamp',
          formats: ['ISO8601'],
        },
      ],
    };

    mockExecuteAsReasoningAgent.mockResolvedValue({
      content: '',
      toolCalls: [
        {
          toolCallId: 'c1',
          function: {
            name: 'commit_pipeline',
            arguments: { pipeline: dateStep },
          },
        },
      ],
      input: [{ role: MessageRole.Assistant, content: '', toolCalls: [] }],
    });

    const result = await suggestProcessingPipeline({
      definition: createIngestDefinition(),
      inferenceClient: mockInferenceClient,
      agentPipelineSchema: postParsePipelineDefinitionSchema,
      maxSteps: 2,
      signal: new AbortController().signal,
      simulatePipeline,
      documents: [{ message: 'hello', extracted: 'x' }],
      fieldsMetadataClient: mockFieldsMetadataClient,
      esClient: mockEsClient,
      initialDatasetAnalysisJson: STUB_INITIAL_DATASET_JSON,
      mappedFields: {},
    });

    expect(result).toMatchSnapshot();
  });

  it('uses full processor schema when agentPipelineSchema is the default', async () => {
    const simulatePipeline = jest
      .fn()
      .mockImplementation(() => Promise.resolve(createSuccessfulSimulation()));

    mockExecuteAsReasoningAgent.mockResolvedValue({
      content: '',
      toolCalls: [
        {
          toolCallId: 'c1',
          function: {
            name: 'commit_pipeline',
            arguments: { pipeline: { steps: [] } },
          },
        },
      ],
      input: [{ role: MessageRole.Assistant, content: '', toolCalls: [] }],
    });

    const result = await suggestProcessingPipeline({
      definition: createIngestDefinition(),
      inferenceClient: mockInferenceClient,
      agentPipelineSchema: pipelineDefinitionSchema,
      maxSteps: 2,
      signal: new AbortController().signal,
      simulatePipeline,
      documents: [{ message: 'hello' }],
      fieldsMetadataClient: mockFieldsMetadataClient,
      esClient: mockEsClient,
      initialDatasetAnalysisJson: STUB_INITIAL_DATASET_JSON,
      mappedFields: {},
    });

    expect(simulatePipeline).not.toHaveBeenCalled();
    expect(result).toMatchSnapshot();
  });

  it('simulate_pipeline callback returns processors and temporary_fields in response', async () => {
    let capturedToolResponse!: SimulationFeedback;

    const simulatePipeline = jest.fn().mockImplementation(() =>
      Promise.resolve(
        createSuccessfulSimulation({
          documents: [
            {
              value: { message: 'ok', 'custom.timestamp': '2024-01-01' },
              errors: [],
              detected_fields: [],
              status: 'parsed',
              processed_by: ['root.steps[0]'],
            },
          ],
          processors_metrics: {
            'root.steps[0]': {
              parsed_rate: 1,
              failed_rate: 0,
              skipped_rate: 0,
              dropped_rate: 0,
              detected_fields: [],
              errors: [],
            },
          },
        })
      )
    );

    mockExecuteAsReasoningAgent.mockImplementation(async ({ toolCallbacks }) => {
      capturedToolResponse = await invokeSimulateCallback(toolCallbacks, {
        steps: [{ action: 'date', from: '@timestamp', formats: ['ISO8601'] }],
      });

      return {
        content: '',
        toolCalls: [
          {
            toolCallId: 'c1',
            function: { name: 'commit_pipeline', arguments: { pipeline: { steps: [] } } },
          },
        ],
        input: [{ role: MessageRole.Assistant, content: '', toolCalls: [] }],
      };
    });

    await suggestProcessingPipeline({
      definition: createIngestDefinition(),
      inferenceClient: mockInferenceClient,
      agentPipelineSchema: pipelineDefinitionSchema,
      maxSteps: 2,
      signal: new AbortController().signal,
      simulatePipeline,
      documents: [{ message: 'hello' }],
      fieldsMetadataClient: mockFieldsMetadataClient,
      esClient: mockEsClient,
      initialDatasetAnalysisJson: STUB_INITIAL_DATASET_JSON,
      mappedFields: {},
    });

    expect(capturedToolResponse).toMatchSnapshot();
  });

  it('no longer rejects pipelines based on aggregate 80% parse rate gate', async () => {
    let capturedToolResponse!: SimulationFeedback;

    const simulatePipeline = jest.fn().mockImplementation(() =>
      Promise.resolve(
        createSuccessfulSimulation({
          documents_metrics: {
            parsed_rate: 0.5,
            failed_rate: 0.5,
            partially_parsed_rate: 0,
            skipped_rate: 0,
            dropped_rate: 0,
          },
          processors_metrics: {
            'root.steps[0]': {
              parsed_rate: 0.5,
              failed_rate: 0.5,
              skipped_rate: 0,
              dropped_rate: 0,
              detected_fields: [],
              errors: [],
            },
          },
          documents: [
            {
              value: { message: 'partial' },
              errors: [
                {
                  type: 'generic_processor_failure',
                  message: 'could not parse',
                  processor_id: 'root.steps[0]',
                },
              ],
              detected_fields: [],
              status: 'failed',
              processed_by: ['root.steps[0]'],
            },
          ],
        })
      )
    );

    mockExecuteAsReasoningAgent.mockImplementation(async ({ toolCallbacks }) => {
      capturedToolResponse = await invokeSimulateCallback(toolCallbacks, {
        steps: [{ action: 'date', from: '@timestamp', formats: ['ISO8601'] }],
      });

      return {
        content: '',
        toolCalls: [
          {
            toolCallId: 'c1',
            function: { name: 'commit_pipeline', arguments: { pipeline: { steps: [] } } },
          },
        ],
        input: [{ role: MessageRole.Assistant, content: '', toolCalls: [] }],
      };
    });

    await suggestProcessingPipeline({
      definition: createIngestDefinition(),
      inferenceClient: mockInferenceClient,
      agentPipelineSchema: pipelineDefinitionSchema,
      maxSteps: 2,
      signal: new AbortController().signal,
      simulatePipeline,
      documents: [{ message: 'hello' }],
      fieldsMetadataClient: mockFieldsMetadataClient,
      esClient: mockEsClient,
      initialDatasetAnalysisJson: STUB_INITIAL_DATASET_JSON,
      mappedFields: {},
    });

    expect(capturedToolResponse.metrics.parse_rate).toBe(50);
    expect(capturedToolResponse.errors).not.toContainEqual(
      expect.stringContaining('Parse rate is too low')
    );
    expect(capturedToolResponse).toMatchSnapshot();
  });

  it('simulate_pipeline callback returns formatted Zod errors for invalid pipeline', async () => {
    let capturedToolResponse!: SimulationFeedback;

    const simulatePipeline = jest.fn();

    mockExecuteAsReasoningAgent.mockImplementation(async ({ toolCallbacks }) => {
      capturedToolResponse = await invokeSimulateCallback(toolCallbacks, {
        steps: [{ action: 'date', from: 123 }],
      });

      return {
        content: '',
        toolCalls: [
          {
            toolCallId: 'c1',
            function: { name: 'commit_pipeline', arguments: { pipeline: { steps: [] } } },
          },
        ],
        input: [{ role: MessageRole.Assistant, content: '', toolCalls: [] }],
      };
    });

    await suggestProcessingPipeline({
      definition: createIngestDefinition(),
      inferenceClient: mockInferenceClient,
      agentPipelineSchema: pipelineDefinitionSchema,
      maxSteps: 2,
      signal: new AbortController().signal,
      simulatePipeline,
      documents: [{ message: 'hello' }],
      fieldsMetadataClient: mockFieldsMetadataClient,
      esClient: mockEsClient,
      initialDatasetAnalysisJson: STUB_INITIAL_DATASET_JSON,
      mappedFields: {},
    });

    expect(simulatePipeline).not.toHaveBeenCalled();
    expect(capturedToolResponse.valid).toBe(false);
    expect(capturedToolResponse).toMatchSnapshot();
  });
});
