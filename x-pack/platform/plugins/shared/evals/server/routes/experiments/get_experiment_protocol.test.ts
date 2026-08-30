/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { EVALS_EXPERIMENT_PROTOCOL_URL, API_VERSIONS } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import { EVALS_EXPERIMENT_WORKFLOW_TAG } from '../../../common/experiments/run_experiment';
import type { EvalsWorkflowsManagementSetup } from '../../types';
import { registerGetExperimentProtocolRoute } from './get_experiment_protocol';

describe('GET /internal/evals/experiments/{experimentId}/protocol', () => {
  const setup = ({
    workflowsManagement,
  }: { workflowsManagement?: EvalsWorkflowsManagementSetup } = {}) => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetExperimentProtocolRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistryMock(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      workflowsManagement,
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_EXPERIMENT_PROTOCOL_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const evaluationScoreService = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    };
    const getMetadata = jest.fn().mockResolvedValue(undefined);
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        evaluationScoreService,
        datasetService: { getClient: () => ({ getMetadata }) },
      } as any,
    });

    return { handler, context, evaluationScoreService, getMetadata, logger };
  };

  const makeRequest = (query: Record<string, string> = {}, experimentId = 'experiment-abc') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_EXPERIMENT_PROTOCOL_URL.replace('{experimentId}', experimentId),
      params: { experimentId },
      query,
    });

  const searchResponse = ({
    totalHits = 12,
    evaluatorBuckets,
  }: {
    totalHits?: number;
    evaluatorBuckets?: unknown[];
  } = {}) => ({
    hits: {
      total: { value: totalHits },
      hits: [
        {
          _source: {
            experiment_name: 'My experiment',
            task: { model: { id: 'gpt-4', family: 'gpt-4', provider: 'openai' } },
            metadata: {
              execution_id: 'exec-1',
              suite_id: 'suite-1',
              hostname: 'worker-01',
              git: { branch: 'main', commit_sha: 'abc123' },
              ci: { build_url: 'https://ci.example/build/1' },
            },
          },
        },
      ],
    },
    aggregations: {
      first_score: { value_as_string: '2026-08-01T00:00:00.000Z' },
      last_score: { value_as_string: '2026-08-01T00:10:00.000Z' },
      total_repetitions: { value: 2 },
      datasets: {
        buckets: [
          {
            key: 'dataset-1',
            dataset_name: { buckets: [{ key: 'My Dataset' }] },
            example_count: { value: 3 },
          },
        ],
      },
      evaluators: {
        buckets: evaluatorBuckets ?? [
          {
            key: 'correctness',
            doc_count: 6,
            version: { buckets: [{ key: '2' }] },
            kind: { buckets: [{ key: 'llm' }] },
            model_id: {
              buckets: [
                {
                  key: 'claude-3',
                  family: { buckets: [{ key: 'Claude' }] },
                  provider: { buckets: [{ key: 'Anthropic' }] },
                },
              ],
            },
          },
          {
            key: 'latency',
            doc_count: 6,
            version: { buckets: [] },
            kind: { buckets: [{ key: 'code' }] },
            model_id: { buckets: [] },
          },
        ],
      },
    },
  });

  it('returns 404 when no documents match the experiment', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Experiment not found for experiment: experiment-abc',
    });
  });

  it('names the execution_id in the 404 message when execution_id filter matches nothing', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce({ hits: { hits: [] } } as any);

    const response = await handler(
      context,
      makeRequest({ execution_id: 'missing-exec' }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(response.payload).toEqual({
      message: 'Experiment not found for execution: missing-exec',
    });
  });

  it('returns protocol and execution sections derived from score documents', async () => {
    const { handler, context, evaluationScoreService, getMetadata } = setup();
    evaluationScoreService.search.mockResolvedValueOnce(searchResponse() as any);
    getMetadata.mockResolvedValueOnce({
      id: 'dataset-1',
      name: 'My Dataset',
      description: 'A dataset',
      examples_count: 5,
      space_ids: ['default'],
    });

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.experiment_id).toBe('experiment-abc');
    expect(response.payload.protocol).toEqual({
      experiment_name: 'My experiment',
      task_model: { id: 'gpt-4', family: 'gpt-4', provider: 'openai' },
      total_repetitions: 2,
      datasets: [
        {
          id: 'dataset-1',
          name: 'My Dataset',
          evaluated_example_count: 3,
          exists: true,
          description: 'A dataset',
          example_count: 5,
        },
      ],
      evaluators: [
        {
          name: 'correctness',
          version: '2',
          kind: 'llm',
          model: { id: 'claude-3', family: 'Claude', provider: 'Anthropic' },
          score_count: 6,
        },
        { name: 'latency', version: undefined, kind: 'code', score_count: 6 },
      ],
    });
    expect(response.payload.execution).toEqual({
      execution_id: 'exec-1',
      suite_id: 'suite-1',
      first_score_at: '2026-08-01T00:00:00.000Z',
      last_score_at: '2026-08-01T00:10:00.000Z',
      git_branch: 'main',
      git_commit_sha: 'abc123',
      ci: { build_url: 'https://ci.example/build/1' },
      hostname: 'worker-01',
      status: 'completed',
      status_source: 'scores',
      completeness: {
        example_count: 3,
        evaluator_count: 2,
        total_repetitions: 2,
        expected_scores: 12,
        received_scores: 12,
        complete: true,
      },
    });
  });

  it('reports a dataset deleted since the run as exists: false, keeping its recorded identity', async () => {
    const { handler, context, evaluationScoreService, getMetadata } = setup();
    evaluationScoreService.search.mockResolvedValueOnce(searchResponse() as any);
    getMetadata.mockResolvedValueOnce(undefined);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.protocol.datasets).toEqual([
      { id: 'dataset-1', name: 'My Dataset', evaluated_example_count: 3, exists: false },
    ]);
  });

  it('never attributes a model to a code evaluator, even when its buckets carry one', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce(
      searchResponse({
        evaluatorBuckets: [
          {
            key: 'latency',
            doc_count: 6,
            version: { buckets: [] },
            kind: { buckets: [{ key: 'code' }] },
            // A stray model bucket (e.g. from legacy documents) must not be attributed.
            model_id: { buckets: [{ key: 'claude-3' }] },
          },
        ],
      }) as any
    );

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.protocol.evaluators).toEqual([
      { name: 'latency', version: undefined, kind: 'code', score_count: 6 },
    ]);
  });

  it('flags an incomplete run when fewer scores exist than examples x repetitions x evaluators', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce(searchResponse({ totalHits: 7 }) as any);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.execution.completeness).toEqual({
      example_count: 3,
      evaluator_count: 2,
      total_repetitions: 2,
      expected_scores: 12,
      received_scores: 7,
      complete: false,
    });
  });

  it('derives status from the workflow execution when workflow_execution_id names an evals run', async () => {
    const getWorkflowExecution = jest.fn().mockResolvedValue({
      id: 'wf-exec-1',
      status: 'running',
      workflowDefinition: { tags: [EVALS_EXPERIMENT_WORKFLOW_TAG] },
    });
    const { handler, context, evaluationScoreService } = setup({
      workflowsManagement: { management: { getWorkflowExecution } } as any,
    });
    evaluationScoreService.search.mockResolvedValueOnce(searchResponse() as any);

    const response = await handler(
      context,
      makeRequest({ workflow_execution_id: 'wf-exec-1' }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(getWorkflowExecution).toHaveBeenCalledWith('wf-exec-1', 'default');
    expect(response.payload.execution.status).toBe('running');
    expect(response.payload.execution.status_source).toBe('workflow');
  });

  it('maps terminal workflow statuses onto the derived status', async () => {
    for (const [workflowStatus, derived] of [
      ['completed', 'completed'],
      ['failed', 'failed'],
      ['timed_out', 'failed'],
      ['cancelled', 'cancelled'],
      ['queued', 'pending'],
    ] as const) {
      const getWorkflowExecution = jest.fn().mockResolvedValue({
        id: 'wf-exec-1',
        status: workflowStatus,
        workflowDefinition: { tags: [EVALS_EXPERIMENT_WORKFLOW_TAG] },
      });
      const { handler, context, evaluationScoreService } = setup({
        workflowsManagement: { management: { getWorkflowExecution } } as any,
      });
      evaluationScoreService.search.mockResolvedValueOnce(searchResponse() as any);

      const response = await handler(
        context,
        makeRequest({ workflow_execution_id: 'wf-exec-1' }),
        kibanaResponseFactory
      );

      expect(response.payload.execution.status).toBe(derived);
      expect(response.payload.execution.status_source).toBe('workflow');
    }
  });

  it('falls back to score-derived status when the workflow execution is not an evals run', async () => {
    const getWorkflowExecution = jest.fn().mockResolvedValue({
      id: 'wf-exec-1',
      status: 'running',
      workflowDefinition: { tags: ['something-else'] },
    });
    const { handler, context, evaluationScoreService, logger } = setup({
      workflowsManagement: { management: { getWorkflowExecution } } as any,
    });
    evaluationScoreService.search.mockResolvedValueOnce(searchResponse() as any);

    const response = await handler(
      context,
      makeRequest({ workflow_execution_id: 'wf-exec-1' }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.execution.status).toBe('completed');
    expect(response.payload.execution.status_source).toBe('scores');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('falls back to score-derived status when the workflow lookup fails', async () => {
    const getWorkflowExecution = jest.fn().mockRejectedValue(new Error('workflows down'));
    const { handler, context, evaluationScoreService, logger } = setup({
      workflowsManagement: { management: { getWorkflowExecution } } as any,
    });
    evaluationScoreService.search.mockResolvedValueOnce(searchResponse() as any);

    const response = await handler(
      context,
      makeRequest({ workflow_execution_id: 'wf-exec-1' }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.execution.status).toBe('completed');
    expect(response.payload.execution.status_source).toBe('scores');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('filters by metadata.execution_id when execution_id is provided', async () => {
    const { handler, context, evaluationScoreService } = setup();
    evaluationScoreService.search.mockResolvedValueOnce(searchResponse() as any);

    await handler(context, makeRequest({ execution_id: 'exec-1' }), kibanaResponseFactory);

    const { query } = evaluationScoreService.search.mock.calls[0][0];
    expect(query.bool.must[0]).toEqual({ term: { 'metadata.execution_id': 'exec-1' } });
  });

  it('returns 500 when ES throws', async () => {
    const { handler, context, evaluationScoreService, logger } = setup();
    evaluationScoreService.search.mockRejectedValueOnce(new Error('ES error'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
