/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCreateAlertEventStepDefinition } from './create_alert_event_step';
import { AlertEventsClient } from '../../alert_events_client';
import { ExecutionError } from '@kbn/workflows/server';

jest.mock('../../alert_events_client');

const MockAlertEventsClient = AlertEventsClient as jest.MockedClass<typeof AlertEventsClient>;

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  get: jest.fn(),
  isLevelEnabled: jest.fn(),
} as any;

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
      getScopedEsClient: jest.fn().mockReturnValue({}),
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'default' } }),
      renderInputTemplate: jest.fn(),
    } as any,
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: abortController.signal,
    stepId: 'test-step',
    stepType: 'alerting.create_alert',
  } as any;
};

describe('getCreateAlertEventStepDefinition', () => {
  beforeEach(() => {
    MockAlertEventsClient.mockClear();
  });

  it('returns group_hash and episode_id on success', async () => {
    const mockIngest = jest.fn().mockResolvedValue({
      group_hash: 'abc123',
      episode_id: 'ep-456',
    });
    MockAlertEventsClient.mockImplementation(() => ({ ingestAlertEvent: mockIngest } as any));

    const definition = getCreateAlertEventStepDefinition(() => mockLogger);
    const result = await definition.handler(createMockContext());

    expect(result).toEqual({ output: { group_hash: 'abc123', episode_id: 'ep-456' } });
  });

  it('constructs AlertEventsClient with spaceId from workflow context', async () => {
    const mockIngest = jest.fn().mockResolvedValue({ group_hash: 'h', episode_id: 'e' });
    MockAlertEventsClient.mockImplementation(() => ({ ingestAlertEvent: mockIngest } as any));

    const definition = getCreateAlertEventStepDefinition(() => mockLogger);
    await definition.handler(createMockContext());

    expect(MockAlertEventsClient).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'default'
    );
  });

  it('passes abortSignal to ingestAlertEvent', async () => {
    const mockIngest = jest.fn().mockResolvedValue({ group_hash: 'h', episode_id: 'e' });
    MockAlertEventsClient.mockImplementation(() => ({ ingestAlertEvent: mockIngest } as any));

    const definition = getCreateAlertEventStepDefinition(() => mockLogger);
    const context = createMockContext();
    await definition.handler(context);

    expect(mockIngest).toHaveBeenCalledWith(
      context.input,
      expect.objectContaining({ abortSignal: context.abortSignal })
    );
  });

  it('wraps client errors in ExecutionError with type ApiError', async () => {
    const cause = new Error('ES connection refused');
    MockAlertEventsClient.mockImplementation(
      () => ({ ingestAlertEvent: jest.fn().mockRejectedValue(cause) } as any)
    );

    const definition = getCreateAlertEventStepDefinition(() => mockLogger);
    const error = await definition.handler(createMockContext()).catch((e) => e);

    expect(error).toBeInstanceOf(ExecutionError);
    expect(error.type).toBe('ApiError');
    expect(error.message).toBe('ES connection refused');
    expect(error.details).toEqual({ name: 'Error', message: 'ES connection refused' });
  });

  it('uses fallback message for non-Error throws', async () => {
    MockAlertEventsClient.mockImplementation(
      () => ({ ingestAlertEvent: jest.fn().mockRejectedValue('string error') } as any)
    );

    const definition = getCreateAlertEventStepDefinition(() => mockLogger);
    const error = await definition.handler(createMockContext()).catch((e) => e);

    expect(error).toBeInstanceOf(ExecutionError);
    expect(error.type).toBe('ApiError');
    expect(error.message).toBe('Failed to create alert event');
  });
});
