/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exportRefreshAndReport } from './evaluate';
import type { EvaluationScoreDocument } from './utils/score_repository';
import type { EvaluationReporter } from './utils/reporting/evaluation_reporter';
import { ModelFamily, ModelProvider } from '@kbn/inference-common';
import type { SomeDevLog } from '@kbn/some-dev-log';

function createMockDocument(
  overrides: Partial<EvaluationScoreDocument> = {}
): EvaluationScoreDocument {
  return {
    '@timestamp': '2025-01-01T00:00:00Z',
    run_id: 'run-1',
    experiment_id: 'exp-1',
    example: {
      id: 'ex-1',
      index: 0,
      dataset: { id: 'ds-1', name: 'Dataset 1' },
    },
    task: {
      trace_id: 'trace-1',
      repetition_index: 0,
      output: null,
      model: { id: 'gpt-4', family: ModelFamily.GPT, provider: ModelProvider.OpenAI },
    },
    evaluator: {
      name: 'Criteria',
      score: 1.0,
      label: 'PASS',
      explanation: 'ok',
      metadata: null,
      trace_id: 'trace-eval-1',
      model: { id: 'claude-3', family: ModelFamily.Claude, provider: ModelProvider.Anthropic },
    },
    run_metadata: { git_branch: 'main', git_commit_sha: 'abc', total_repetitions: 1 },
    environment: { hostname: 'test-host' },
    ...overrides,
  };
}

describe('exportRefreshAndReport', () => {
  let mockEsClient: any;
  let mockScoreRepository: any;
  let mockReportModelScore: jest.MockedFunction<EvaluationReporter>;
  let mockLog: jest.Mocked<SomeDevLog>;
  let callOrder: string[];

  beforeEach(() => {
    callOrder = [];

    mockEsClient = {
      indices: {
        refresh: jest.fn().mockImplementation(async () => {
          callOrder.push('refresh');
        }),
      },
    };

    mockScoreRepository = {
      exportScores: jest.fn().mockImplementation(async () => {
        callOrder.push('exportScores');
      }),
    };

    mockReportModelScore = jest.fn().mockImplementation(async () => {
      callOrder.push('reportModelScore');
    });

    mockLog = {
      debug: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as any;
  });

  it('calls export, then refresh, then report — in that order', async () => {
    await exportRefreshAndReport({
      documents: [createMockDocument()],
      scoreRepository: mockScoreRepository,
      evaluationsEsClient: mockEsClient,
      reportModelScore: mockReportModelScore,
      runId: 'test-run',
      log: mockLog,
      taskModelId: 'gpt-4',
    });

    expect(callOrder).toEqual(['exportScores', 'refresh', 'reportModelScore']);
  });

  it('refreshes the kibana-evaluations index', async () => {
    await exportRefreshAndReport({
      documents: [createMockDocument()],
      scoreRepository: mockScoreRepository,
      evaluationsEsClient: mockEsClient,
      reportModelScore: mockReportModelScore,
      runId: 'test-run',
      log: mockLog,
      taskModelId: 'gpt-4',
    });

    expect(mockEsClient.indices.refresh).toHaveBeenCalledWith({ index: 'kibana-evaluations' });
  });

  it('still reports when refresh fails (e.g. index not yet created)', async () => {
    mockEsClient.indices.refresh.mockRejectedValueOnce(new Error('index_not_found_exception'));

    await exportRefreshAndReport({
      documents: [createMockDocument()],
      scoreRepository: mockScoreRepository,
      evaluationsEsClient: mockEsClient,
      reportModelScore: mockReportModelScore,
      runId: 'test-run',
      log: mockLog,
      taskModelId: 'gpt-4',
    });

    expect(mockReportModelScore).toHaveBeenCalledWith(mockScoreRepository, 'test-run', mockLog, {
      taskModelId: 'gpt-4',
      suiteId: undefined,
    });
  });

  it('passes suiteId through to reportModelScore', async () => {
    await exportRefreshAndReport({
      documents: [createMockDocument()],
      scoreRepository: mockScoreRepository,
      evaluationsEsClient: mockEsClient,
      reportModelScore: mockReportModelScore,
      runId: 'test-run',
      log: mockLog,
      taskModelId: 'gpt-4',
      suiteId: 'pci-compliance',
    });

    expect(mockReportModelScore).toHaveBeenCalledWith(mockScoreRepository, 'test-run', mockLog, {
      taskModelId: 'gpt-4',
      suiteId: 'pci-compliance',
    });
  });

  it('does not refresh or report when export throws', async () => {
    mockScoreRepository.exportScores.mockRejectedValueOnce(new Error('bulk indexing failed'));

    await expect(
      exportRefreshAndReport({
        documents: [createMockDocument()],
        scoreRepository: mockScoreRepository,
        evaluationsEsClient: mockEsClient,
        reportModelScore: mockReportModelScore,
        runId: 'test-run',
        log: mockLog,
        taskModelId: 'gpt-4',
      })
    ).rejects.toThrow('bulk indexing failed');

    expect(mockEsClient.indices.refresh).not.toHaveBeenCalled();
    expect(mockReportModelScore).not.toHaveBeenCalled();
  });

  it('still refreshes and reports when documents are empty (export short-circuits)', async () => {
    await exportRefreshAndReport({
      documents: [],
      scoreRepository: mockScoreRepository,
      evaluationsEsClient: mockEsClient,
      reportModelScore: mockReportModelScore,
      runId: 'test-run',
      log: mockLog,
      taskModelId: 'gpt-4',
    });

    expect(mockScoreRepository.exportScores).not.toHaveBeenCalled();
    expect(mockEsClient.indices.refresh).toHaveBeenCalledWith({ index: 'kibana-evaluations' });
    expect(mockReportModelScore).toHaveBeenCalled();
  });
});
