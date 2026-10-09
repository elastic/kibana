/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import { getCreateAlertEventStepDefinition } from './create_alert_event_step';

const fakeRequest = { headers: {} } as unknown as KibanaRequest;

const createMockContext = () => {
  const abortController = new AbortController();
  return {
    input: {
      source: 'datadog',
      fingerprint: 'monitor-abc',
      alert_status: 'active' as const,
    },
    rawInput: {},
    config: {},
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
      getScopedEsClient: jest.fn(),
      getContext: jest.fn(),
      renderInputTemplate: jest.fn(),
    } as any,
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: abortController.signal,
    stepId: 'test-step',
    stepType: 'alerting.create_alert',
  } as any;
};

const allowedPrivilege = jest.fn().mockResolvedValue(true);
const deniedPrivilege = jest.fn().mockResolvedValue(false);

beforeEach(() => {
  allowedPrivilege.mockClear();
  deniedPrivilege.mockClear();
});

describe('getCreateAlertEventStepDefinition', () => {
  it('returns group_hash and episode_id on success', async () => {
    const mockIngest = jest.fn().mockResolvedValue({ group_hash: 'abc123', episode_id: 'ep-456' });
    const getAlertEventsClient = jest.fn().mockResolvedValue({ createAlertEvent: mockIngest });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const result = await handler(createMockContext());

    expect(result).toEqual({ output: { group_hash: 'abc123', episode_id: 'ep-456' } });
  });

  it('calls the factory with the result of getFakeRequest()', async () => {
    const mockIngest = jest.fn().mockResolvedValue({ group_hash: 'h', episode_id: 'e' });
    const getAlertEventsClient = jest.fn().mockResolvedValue({ createAlertEvent: mockIngest });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const context = createMockContext();
    await handler(context);

    expect(getAlertEventsClient).toHaveBeenCalledWith(fakeRequest);
  });

  it('passes abortSignal to createAlertEvent', async () => {
    const mockIngest = jest.fn().mockResolvedValue({ group_hash: 'h', episode_id: 'e' });
    const getAlertEventsClient = jest.fn().mockResolvedValue({ createAlertEvent: mockIngest });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const context = createMockContext();
    await handler(context);

    expect(mockIngest).toHaveBeenCalledWith(
      expect.objectContaining(context.input),
      expect.objectContaining({ abortSignal: context.abortSignal })
    );
  });

  it('throws ValidationError when source violates schema refinements', async () => {
    const getAlertEventsClient = jest.fn().mockResolvedValue({ createAlertEvent: jest.fn() });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const context = createMockContext();
    context.input = { ...context.input, source: 'elastic_monitoring' };
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ValidationError');
  });

  it('throws PermissionError and does not fetch the client when privilege check fails', async () => {
    const getAlertEventsClient = jest.fn().mockResolvedValue({ createAlertEvent: jest.fn() });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient, deniedPrivilege);
    const thrown = await handler(createMockContext()).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('PermissionError');
    expect(getAlertEventsClient).not.toHaveBeenCalled();
  });

  it('re-throws without wrapping when the abort signal is aborted', async () => {
    const abortController = new AbortController();
    abortController.abort();
    const cause = Object.assign(new Error('Request aborted'), { name: 'RequestAbortedError' });
    const getAlertEventsClient = jest
      .fn()
      .mockResolvedValue({ createAlertEvent: jest.fn().mockRejectedValue(cause) });

    const context = createMockContext();
    context.abortSignal = abortController.signal;

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBe(cause);
    expect(thrown).not.toBeInstanceOf(ExecutionError);
  });

  it('wraps generic errors from createAlertEvent as ApiError', async () => {
    const cause = new Error('ES connection refused');
    const getAlertEventsClient = jest
      .fn()
      .mockResolvedValue({ createAlertEvent: jest.fn().mockRejectedValue(cause) });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const thrown = await handler(createMockContext()).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ApiError');
    expect(thrown.message).toBe('ES connection refused');
    expect(thrown.details).toEqual({ name: 'Error', message: 'ES connection refused' });
  });

  it('uses fallback message for non-Error throws from createAlertEvent', async () => {
    const getAlertEventsClient = jest
      .fn()
      .mockResolvedValue({ createAlertEvent: jest.fn().mockRejectedValue('string error') });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const thrown = await handler(createMockContext()).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ApiError');
    expect(thrown.message).toBe('Failed to create alert event');
  });
});
