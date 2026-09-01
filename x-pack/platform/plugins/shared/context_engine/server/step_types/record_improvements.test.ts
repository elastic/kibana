/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import { IMPROVEMENT_ACTIONS } from '../../common/http_api/improvement_actions';
import type { AiIndexService } from '../ai_indices/service';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { ImprovementsServiceApi } from '../improvements/service';
import { recordImprovements } from '../feedback_analysis/record_improvements';
import { getRecordImprovementsStepDefinition } from './record_improvements';
import { createMockStepContext, mockKiStepTelemetry } from './test_utils';

jest.mock('../feedback_analysis/record_improvements');

const recordImprovementsMock = jest.mocked(recordImprovements);

const RESULT = {
  recorded: [{ improvement_id: 'imp-1', action: 'add_ki', title: 'Add a KI for refunds' }],
  skipped: [],
};

const INPUT = {
  ai_index_id: 'orders',
  agent_run_id: 'execution-1',
  signal_window: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T00:00:00.000Z' },
  signal_spaces: ['default'],
  improvements: [{ action: 'add_ki', title: 'Add a KI for refunds' }],
};

const improvementsService = {} as ImprovementsServiceApi;

const buildStep = ({
  aiIndex = { id: 'orders' } as Awaited<ReturnType<AiIndexService['get']>>,
  auditLogger,
  contextEngineEnabled = true,
  feedbackLoopEnabled = true,
  canWrite = true,
}: {
  aiIndex?: Awaited<ReturnType<AiIndexService['get']>>;
  auditLogger?: AuditLogger;
  contextEngineEnabled?: boolean;
  feedbackLoopEnabled?: boolean;
  canWrite?: boolean;
} = {}) => {
  const get = jest.fn().mockResolvedValue(aiIndex);
  const definition = getRecordImprovementsStepDefinition({
    getAiIndexService: () => ({ get } as unknown as AiIndexService),
    getImprovementsService: () => improvementsService,
    getAuditLogger: async () => auditLogger,
    isContextEngineEnabled: async () => contextEngineEnabled,
    isFeedbackLoopEnabled: async () => feedbackLoopEnabled,
    checkWritePrivilege: async () => canWrite,
    ...mockKiStepTelemetry(),
  });
  return { ...definition, get };
};

beforeEach(() => {
  jest.clearAllMocks();
  recordImprovementsMock.mockResolvedValue(RESULT);
});

describe('getRecordImprovementsStepDefinition', () => {
  it('returns what was recorded and what was skipped', async () => {
    const context = createMockStepContext({ input: INPUT, esClient: {} });

    expect(await buildStep().handler(context)).toEqual({ output: RESULT });
  });

  it('reads the action policy off the index rather than trusting the run', async () => {
    const context = createMockStepContext({ input: INPUT, esClient: {} });
    const { handler, get } = buildStep({
      aiIndex: {
        id: 'orders',
        feedback_analysis: { enabled: true, allowed_actions: ['add_ki'] },
      } as unknown as Awaited<ReturnType<AiIndexService['get']>>,
    });

    await handler(context);

    expect(get).toHaveBeenCalledWith('orders');
    expect(recordImprovementsMock).toHaveBeenCalledWith(
      expect.objectContaining({ allowedActions: ['add_ki'] })
    );
  });

  it('permits the full taxonomy for an index that was never configured', async () => {
    const context = createMockStepContext({ input: INPUT, esClient: {} });

    await buildStep().handler(context);

    expect(recordImprovementsMock).toHaveBeenCalledWith(
      expect.objectContaining({ allowedActions: [...IMPROVEMENT_ACTIONS] })
    );
  });

  it('records an empty allowed_actions as observe-only instead of falling back to the default', async () => {
    const context = createMockStepContext({ input: INPUT, esClient: {} });
    const { handler } = buildStep({
      aiIndex: {
        id: 'orders',
        feedback_analysis: { enabled: true, allowed_actions: [] },
      } as unknown as Awaited<ReturnType<AiIndexService['get']>>,
    });

    await handler(context);

    expect(recordImprovementsMock).toHaveBeenCalledWith(
      expect.objectContaining({ allowedActions: [] })
    );
  });

  it('writes as the workflow owner and carries the run provenance through', async () => {
    const esClient = { bulk: jest.fn() };
    const context = createMockStepContext({ input: INPUT, esClient });

    await buildStep().handler(context);

    expect(recordImprovementsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aiIndexId: 'orders',
        agentRunId: 'execution-1',
        signalWindow: INPUT.signal_window,
        signalSpaces: ['default'],
        proposals: INPUT.improvements,
        improvementsService,
      })
    );
  });

  it('audits the write', async () => {
    const auditLogger = { log: jest.fn() } as unknown as AuditLogger;
    const context = createMockStepContext({ input: INPUT, esClient: {} });

    await buildStep({ auditLogger }).handler(context);

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'context_engine_improvement_record',
          outcome: 'success',
        }),
      })
    );
  });

  it('audits a failed write before letting it surface', async () => {
    const auditLogger = { log: jest.fn() } as unknown as AuditLogger;
    recordImprovementsMock.mockRejectedValue(new Error('bulk rejected'));
    const context = createMockStepContext({ input: INPUT, esClient: {} });

    await expect(buildStep({ auditLogger }).handler(context)).rejects.toThrow('bulk rejected');
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ outcome: 'failure' }),
      })
    );
  });

  it('fails the step when the AI index was deleted mid-run', async () => {
    const context = createMockStepContext({ input: INPUT, esClient: {} });
    const definition = getRecordImprovementsStepDefinition({
      getAiIndexService: () =>
        ({ get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('orders')) } as never),
      getImprovementsService: () => improvementsService,
      getAuditLogger: async () => undefined,
      isContextEngineEnabled: async () => true,
      isFeedbackLoopEnabled: async () => true,
      checkWritePrivilege: async () => true,
      ...mockKiStepTelemetry(),
    });

    await expect(definition.handler(context)).rejects.toThrow(
      expect.objectContaining({ type: 'NotFoundError' })
    );
    expect(recordImprovementsMock).not.toHaveBeenCalled();
  });

  it('refuses to write when the workflow owner lacks the write privilege', async () => {
    const context = createMockStepContext({ input: INPUT, esClient: {} });

    await expect(buildStep({ canWrite: false }).handler(context)).rejects.toThrow(
      expect.objectContaining({ type: 'PermissionError' })
    );
    expect(recordImprovementsMock).not.toHaveBeenCalled();
  });

  it('refuses to write when Context Engine is off in the space', async () => {
    const context = createMockStepContext({ input: INPUT, esClient: {} });

    await expect(buildStep({ contextEngineEnabled: false }).handler(context)).rejects.toThrow(
      ExecutionError
    );
    expect(recordImprovementsMock).not.toHaveBeenCalled();
  });

  it('refuses to write when the feedback loop is off', async () => {
    const context = createMockStepContext({ input: INPUT, esClient: {} });

    await expect(buildStep({ feedbackLoopEnabled: false }).handler(context)).rejects.toThrow(
      expect.objectContaining({ type: 'FeatureDisabledError' })
    );
    expect(recordImprovementsMock).not.toHaveBeenCalled();
  });
});
