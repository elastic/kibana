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

describe('getCreateAlertEventStepDefinition', () => {
  it('returns group_hash and episode_id on success', async () => {
    const mockIngest = jest.fn().mockResolvedValue({ group_hash: 'abc123', episode_id: 'ep-456' });
    const getAlertEventsClient = jest.fn().mockResolvedValue({ ingestAlertEvent: mockIngest });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient);
    const result = await handler(createMockContext());

    expect(result).toEqual({ output: { group_hash: 'abc123', episode_id: 'ep-456' } });
  });

  it('calls the factory with the result of getFakeRequest()', async () => {
    const mockIngest = jest.fn().mockResolvedValue({ group_hash: 'h', episode_id: 'e' });
    const getAlertEventsClient = jest.fn().mockResolvedValue({ ingestAlertEvent: mockIngest });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient);
    const context = createMockContext();
    await handler(context);

    expect(getAlertEventsClient).toHaveBeenCalledWith(fakeRequest);
  });

  it('passes abortSignal to ingestAlertEvent', async () => {
    const mockIngest = jest.fn().mockResolvedValue({ group_hash: 'h', episode_id: 'e' });
    const getAlertEventsClient = jest.fn().mockResolvedValue({ ingestAlertEvent: mockIngest });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient);
    const context = createMockContext();
    await handler(context);

    expect(mockIngest).toHaveBeenCalledWith(
      context.input,
      expect.objectContaining({ abortSignal: context.abortSignal })
    );
  });

  it('propagates PermissionError from the factory unchanged', async () => {
    const permissionError = new ExecutionError({ type: 'PermissionError', message: 'Forbidden' });
    const getAlertEventsClient = jest.fn().mockRejectedValue(permissionError);

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient);
    const thrown = await handler(createMockContext()).catch((e) => e);

    expect(thrown).toBe(permissionError);
    expect(thrown.type).toBe('PermissionError');
  });

  it('propagates AbortError from ingestAlertEvent unchanged', async () => {
    const abortError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    const getAlertEventsClient = jest
      .fn()
      .mockResolvedValue({ ingestAlertEvent: jest.fn().mockRejectedValue(abortError) });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient);
    const thrown = await handler(createMockContext()).catch((e) => e);

    expect(thrown).toBe(abortError);
    expect(thrown).not.toBeInstanceOf(ExecutionError);
  });

  it('wraps generic errors from ingestAlertEvent as ApiError', async () => {
    const cause = new Error('ES connection refused');
    const getAlertEventsClient = jest
      .fn()
      .mockResolvedValue({ ingestAlertEvent: jest.fn().mockRejectedValue(cause) });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient);
    const thrown = await handler(createMockContext()).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ApiError');
    expect(thrown.message).toBe('ES connection refused');
    expect(thrown.details).toEqual({ name: 'Error', message: 'ES connection refused' });
  });

  it('uses fallback message for non-Error throws from ingestAlertEvent', async () => {
    const getAlertEventsClient = jest
      .fn()
      .mockResolvedValue({ ingestAlertEvent: jest.fn().mockRejectedValue('string error') });

    const { handler } = getCreateAlertEventStepDefinition(getAlertEventsClient);
    const thrown = await handler(createMockContext()).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ApiError');
    expect(thrown.message).toBe('Failed to create alert event');
  });
});
