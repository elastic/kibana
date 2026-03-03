/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import agent from 'elastic-apm-node';
import { ApmMiddleware } from './apm_middleware';
import { createRuleExecutionMiddlewareContext } from './test_utils';
import { collectStreamResults, createPipelineStream, createRulePipelineState } from '../test_utils';

jest.mock('elastic-apm-node', () => ({
  startSpan: jest.fn(),
}));

const agentMock = agent as jest.Mocked<typeof agent>;

describe('ApmMiddleware', () => {
  let middleware: ApmMiddleware;
  let mockSpan: { addLabels: jest.Mock; outcome: string | undefined; end: jest.Mock };

  beforeEach(() => {
    middleware = new ApmMiddleware();
    mockSpan = { addLabels: jest.fn(), outcome: undefined, end: jest.fn() };
    agentMock.startSpan.mockReturnValue(mockSpan as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('wraps the stream in an APM span and sets success outcome', async () => {
    const state = createRulePipelineState();
    const context = createRuleExecutionMiddlewareContext();
    const next = jest.fn().mockReturnValue(createPipelineStream([state]));

    const results = await collectStreamResults(
      middleware.execute(context, next, createPipelineStream([state]))
    );

    expect(results).toEqual([{ type: 'continue', state }]);
    expect(agentMock.startSpan).toHaveBeenCalledWith('rule_executor:test_step', 'rule_executor');
    expect(mockSpan.addLabels).toHaveBeenCalledWith({ plugin: 'alerting_v2' });
    expect(mockSpan.outcome).toBe('success');
    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  it('sets failure outcome and ends span when stream throws', async () => {
    const context = createRuleExecutionMiddlewareContext();
    const error = new Error('stream error');

    const next = jest.fn().mockReturnValue(
      (async function* () {
        throw error;
      })()
    );

    await expect(
      collectStreamResults(middleware.execute(context, next, createPipelineStream()))
    ).rejects.toThrow('stream error');

    expect(mockSpan.outcome).toBe('failure');
    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  it('yields all results from the inner stream', async () => {
    const state1 = createRulePipelineState();
    const state2 = createRulePipelineState();
    const context = createRuleExecutionMiddlewareContext();
    const next = jest.fn().mockReturnValue(createPipelineStream([state1, state2]));

    const results = await collectStreamResults(
      middleware.execute(context, next, createPipelineStream([state1, state2]))
    );

    expect(results).toHaveLength(2);
    expect(mockSpan.outcome).toBe('success');
    expect(mockSpan.end).toHaveBeenCalledTimes(1);
  });

  it('handles null span gracefully when agent is not started', async () => {
    agentMock.startSpan.mockReturnValue(null as never);

    const state = createRulePipelineState();
    const context = createRuleExecutionMiddlewareContext();
    const next = jest.fn().mockReturnValue(createPipelineStream([state]));

    const results = await collectStreamResults(
      middleware.execute(context, next, createPipelineStream([state]))
    );

    expect(results).toEqual([{ type: 'continue', state }]);
    expect(mockSpan.addLabels).not.toHaveBeenCalled();
    expect(mockSpan.end).not.toHaveBeenCalled();
  });
});
