/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { AiIndexService } from '../ai_indices/service';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { ImprovementsServiceApi } from '../improvements/service';
import { buildFeedbackContext } from '../feedback_analysis/context';
import { InvalidSignalWindowError } from '../feedback_analysis/errors';
import { getFeedbackContextStepDefinition } from './feedback_context';
import { createMockStepContext, mockKiStepTelemetry } from './test_utils';

jest.mock('../feedback_analysis/context');

const buildFeedbackContextMock = jest.mocked(buildFeedbackContext);

const CONTEXT = {
  agent_id: 'analysis-agent',
  briefing: '# Feedback analysis for AI index `orders`',
  output_schema: { type: 'object', properties: { improvements: {} } },
  has_signals: true,
  run: {
    signal_window: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T00:00:00.000Z' },
    signal_spaces: ['default', 'marketing'],
    signal_count: 12,
  },
};

const aiIndexService = {} as AiIndexService;
const improvementsService = {} as ImprovementsServiceApi;

const buildStep = ({
  contextEngineEnabled = true,
  feedbackLoopEnabled = true,
}: { contextEngineEnabled?: boolean; feedbackLoopEnabled?: boolean } = {}) =>
  getFeedbackContextStepDefinition({
    getAiIndexService: () => aiIndexService,
    getImprovementsService: () => improvementsService,
    getAuditLogger: async () => undefined,
    isContextEngineEnabled: async () => contextEngineEnabled,
    isFeedbackLoopEnabled: async () => feedbackLoopEnabled,
    checkWritePrivilege: async () => true,
    ...mockKiStepTelemetry(),
  });

beforeEach(() => {
  jest.clearAllMocks();
  buildFeedbackContextMock.mockResolvedValue(CONTEXT);
});

describe('getFeedbackContextStepDefinition', () => {
  it('flattens the run context into the step output the workflow templates against', async () => {
    const context = createMockStepContext({ input: { ai_index_id: 'orders' }, esClient: {} });

    const { handler } = buildStep();

    expect(await handler(context)).toEqual({
      output: {
        agent_id: 'analysis-agent',
        briefing: CONTEXT.briefing,
        output_schema: CONTEXT.output_schema,
        has_signals: true,
        signal_window: CONTEXT.run.signal_window,
        signal_spaces: ['default', 'marketing'],
        signal_count: 12,
      },
    });
  });

  it('reads and writes as the workflow owner, not as Kibana', async () => {
    const esClient = { search: jest.fn() };
    const context = createMockStepContext({ input: { ai_index_id: 'orders' }, esClient });

    await buildStep().handler(context);

    expect(buildFeedbackContextMock).toHaveBeenCalledWith(
      'orders',
      expect.objectContaining({ esClient })
    );
  });

  it('reports a window with nothing classified so the run can skip the agent', async () => {
    buildFeedbackContextMock.mockResolvedValue({ ...CONTEXT, has_signals: false });
    const context = createMockStepContext({ input: { ai_index_id: 'orders' }, esClient: {} });

    const result = await buildStep().handler(context);

    expect(result.output.has_signals).toBe(false);
  });

  it('fails the step when the AI index no longer exists', async () => {
    buildFeedbackContextMock.mockRejectedValue(new AiIndexNotFoundError('orders'));
    const context = createMockStepContext({ input: { ai_index_id: 'orders' }, esClient: {} });

    await expect(buildStep().handler(context)).rejects.toThrow(
      expect.objectContaining({ type: 'NotFoundError' })
    );
  });

  it('fails the step when the configured signal window cannot be resolved', async () => {
    buildFeedbackContextMock.mockRejectedValue(new InvalidSignalWindowError('bad date math'));
    const context = createMockStepContext({ input: { ai_index_id: 'orders' }, esClient: {} });

    await expect(buildStep().handler(context)).rejects.toThrow(
      expect.objectContaining({ type: 'ValidationError' })
    );
  });

  it('lets an unexpected failure surface rather than masking it as a workflow error', async () => {
    const boom = new Error('elasticsearch unavailable');
    buildFeedbackContextMock.mockRejectedValue(boom);
    const context = createMockStepContext({ input: { ai_index_id: 'orders' }, esClient: {} });

    await expect(buildStep().handler(context)).rejects.toBe(boom);
  });

  it('refuses to run when Context Engine is off in the space', async () => {
    const context = createMockStepContext({ input: { ai_index_id: 'orders' }, esClient: {} });

    await expect(buildStep({ contextEngineEnabled: false }).handler(context)).rejects.toThrow(
      ExecutionError
    );
    expect(buildFeedbackContextMock).not.toHaveBeenCalled();
  });

  it('refuses to run when the feedback loop is off', async () => {
    const context = createMockStepContext({ input: { ai_index_id: 'orders' }, esClient: {} });

    await expect(buildStep({ feedbackLoopEnabled: false }).handler(context)).rejects.toThrow(
      expect.objectContaining({ type: 'FeatureDisabledError' })
    );
    expect(buildFeedbackContextMock).not.toHaveBeenCalled();
  });
});
