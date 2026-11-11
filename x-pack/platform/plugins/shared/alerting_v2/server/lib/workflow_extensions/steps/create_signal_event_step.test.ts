/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { getCreateSignalEventStepDefinition } from './create_signal_event_step';

const fakeRequest = httpServerMock.createKibanaRequest();

const createMockContext = (
  input: Record<string, unknown> = { source: 'datadog' },
  abortSignal: AbortSignal = new AbortController().signal
): StepHandlerContext<any, any> => ({
  input,
  rawInput: input,
  config: {},
  contextManager: {
    getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
    getScopedEsClient: jest.fn(),
    getContext: jest.fn(),
    renderInputTemplate: jest.fn(),
    callKibanaApi: jest.fn(),
  },
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  abortSignal,
  stepId: 'test-step',
  stepType: 'alerting.create_signal',
});

const allowedPrivilege = jest.fn().mockResolvedValue(true);
const deniedPrivilege = jest.fn().mockResolvedValue(false);

beforeEach(() => {
  allowedPrivilege.mockClear();
  deniedPrivilege.mockClear();
});

describe('getCreateSignalEventStepDefinition', () => {
  it('returns group_hash for a signal with no identity input', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ group_hash: 'abc123' });
    const getAlertEventsClient = jest.fn().mockResolvedValue({ createSignalEvent: mockCreate });

    const { handler } = getCreateSignalEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const result = await handler(createMockContext());

    expect(result).toEqual({ output: { group_hash: 'abc123' } });
    expect(mockCreate).toHaveBeenCalledWith({ source: 'datadog' });
    expect(getAlertEventsClient).toHaveBeenCalledWith(fakeRequest);
  });

  it('passes the data, timestamp, severity and fingerprint through to the client', async () => {
    const input = {
      source: 'datadog',
      data: { message: 'disk almost full' },
      timestamp: '2026-11-06T10:00:00.000Z',
      severity: 'high',
      fingerprint: 'fp-1',
    };
    const mockCreate = jest.fn().mockResolvedValue({ group_hash: 'abc123' });
    const getAlertEventsClient = jest.fn().mockResolvedValue({ createSignalEvent: mockCreate });

    const { handler } = getCreateSignalEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const result = await handler(createMockContext(input));

    expect(result).toEqual({ output: { group_hash: 'abc123' } });
    expect(mockCreate).toHaveBeenCalledWith(input);
  });

  it.each([
    ['a reserved source prefix', { source: 'elastic_monitoring' }],
    ['an alert lifecycle status', { source: 'datadog', alert_status: 'active' }],
    ['a rule id', { source: 'datadog', rule_id: 'rule-1' }],
    ['a missing source', {}],
  ])('throws ValidationError for %s', async (_name, input) => {
    const mockCreate = jest.fn();
    const getAlertEventsClient = jest.fn().mockResolvedValue({ createSignalEvent: mockCreate });

    const { handler } = getCreateSignalEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const thrown = await handler(createMockContext(input)).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ValidationError');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('throws PermissionError and does not fetch the client when privilege check fails', async () => {
    const getAlertEventsClient = jest.fn().mockResolvedValue({ createSignalEvent: jest.fn() });

    const { handler } = getCreateSignalEventStepDefinition(getAlertEventsClient, deniedPrivilege);
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
      .mockResolvedValue({ createSignalEvent: jest.fn().mockRejectedValue(cause) });

    const { handler } = getCreateSignalEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const thrown = await handler(createMockContext(undefined, abortController.signal)).catch(
      (e) => e
    );

    expect(thrown).toBe(cause);
    expect(thrown).not.toBeInstanceOf(ExecutionError);
  });

  it('throws ApiError when createSignalEvent fails for another reason', async () => {
    const cause = new Error('ES connection refused');
    const getAlertEventsClient = jest
      .fn()
      .mockResolvedValue({ createSignalEvent: jest.fn().mockRejectedValue(cause) });

    const { handler } = getCreateSignalEventStepDefinition(getAlertEventsClient, allowedPrivilege);
    const thrown = await handler(createMockContext()).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ApiError');
    expect(thrown.message).toBe('ES connection refused');
  });
});
