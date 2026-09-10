/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { NightshiftInvestigationsServerStart } from '@kbn/nightshift-investigations-plugin/server';
import { InvestigationUnavailableError } from '@kbn/nightshift-investigations-plugin/server';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { triggerInvestigationWorkflow } from './trigger_investigation_workflow';

const createEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_uuid: 'event-1',
  event_id: 'checkout-latency-breach',
  status: 'open',
  stream_names: ['logs.checkout', 'metrics.checkout'],
  title: 'Checkout latency breach',
  summary: 'P99 latency climbed above 2s.',
  severity: '60-high',
  confidence: 0.9,
  ...overrides,
});

const createNightshiftInvestigations = (
  executionId = 'exec-abc'
): NightshiftInvestigationsServerStart => {
  const start = jest.fn().mockResolvedValue({ investigation_id: executionId });
  return {
    getInvestigationsClient: jest.fn().mockReturnValue({ start }),
  } as unknown as NightshiftInvestigationsServerStart;
};

const getStartMock = (nightshiftInvestigations: NightshiftInvestigationsServerStart) =>
  (nightshiftInvestigations.getInvestigationsClient as jest.Mock).mock.results[0].value.start;

const createRequest = () => ({} as KibanaRequest);
const createLogger = () =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

describe('triggerInvestigationWorkflow', () => {
  it('returns the execution id when the investigation starts successfully', async () => {
    const event = createEvent();
    const nightshiftInvestigations = createNightshiftInvestigations();

    const result = await triggerInvestigationWorkflow({
      nightshiftInvestigations,
      request: createRequest(),
      logger: createLogger(),
      event,
    });

    expect(result).toBe('exec-abc');
    expect(nightshiftInvestigations.getInvestigationsClient).toHaveBeenCalledTimes(1);
  });

  it('builds the message from event title and summary', async () => {
    const event = createEvent({
      title: 'High error rate',
      summary: 'Error rate spiked.',
    });
    const nightshiftInvestigations = createNightshiftInvestigations();

    await triggerInvestigationWorkflow({
      nightshiftInvestigations,
      request: createRequest(),
      logger: createLogger(),
      event,
    });

    const [request] = getStartMock(nightshiftInvestigations).mock.calls[0];
    expect(request.message).toBe('High error rate\n\nError rate spiked.');
  });

  it('uses event_id as the concurrency_key', async () => {
    const event = createEvent({ event_id: 'my-slug' });
    const nightshiftInvestigations = createNightshiftInvestigations();

    await triggerInvestigationWorkflow({
      nightshiftInvestigations,
      request: createRequest(),
      logger: createLogger(),
      event,
    });

    const [request] = getStartMock(nightshiftInvestigations).mock.calls[0];
    expect(request.concurrency_key).toBe('my-slug');
  });

  it('sets subject.id to event_id and includes event_uuid in the context', async () => {
    const event = createEvent({ event_uuid: 'event-42', event_id: 'my-stable-id' });
    const nightshiftInvestigations = createNightshiftInvestigations();

    await triggerInvestigationWorkflow({
      nightshiftInvestigations,
      request: createRequest(),
      logger: createLogger(),
      event,
    });

    const [request] = getStartMock(nightshiftInvestigations).mock.calls[0];
    expect(request.subject).toEqual({
      type: 'significant_event',
      id: 'my-stable-id',
      summary: 'P99 latency climbed above 2s.',
    });
    expect(request.trigger_type).toBe('manual');
    expect(request.context.event_uuid).toBe('event-42');
  });

  it('passes the event stream_names through', async () => {
    const event = createEvent({ stream_names: ['logs.checkout'] });
    const nightshiftInvestigations = createNightshiftInvestigations();

    await triggerInvestigationWorkflow({
      nightshiftInvestigations,
      request: createRequest(),
      logger: createLogger(),
      event,
    });

    const [request] = getStartMock(nightshiftInvestigations).mock.calls[0];
    expect(request.stream_names).toEqual(['logs.checkout']);
  });

  it('returns undefined when nightshiftInvestigations is not available', async () => {
    const result = await triggerInvestigationWorkflow({
      nightshiftInvestigations: undefined,
      request: createRequest(),
      logger: createLogger(),
      event: createEvent(),
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined and logs a warning when client.start() throws InvestigationUnavailableError', async () => {
    const start = jest
      .fn()
      .mockRejectedValue(
        new InvestigationUnavailableError('Investigations are not configured in this space')
      );
    const nightshiftInvestigations = {
      getInvestigationsClient: jest.fn().mockReturnValue({ start }),
    } as unknown as NightshiftInvestigationsServerStart;
    const logger = createLogger();

    const result = await triggerInvestigationWorkflow({
      nightshiftInvestigations,
      request: createRequest(),
      logger,
      event: createEvent(),
    });

    expect(result).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Investigation trigger failed')
    );
  });

  it('rethrows unexpected errors from client.start()', async () => {
    const start = jest.fn().mockRejectedValue(new Error('Elasticsearch connection refused'));
    const nightshiftInvestigations = {
      getInvestigationsClient: jest.fn().mockReturnValue({ start }),
    } as unknown as NightshiftInvestigationsServerStart;

    await expect(
      triggerInvestigationWorkflow({
        nightshiftInvestigations,
        request: createRequest(),
        logger: createLogger(),
        event: createEvent(),
      })
    ).rejects.toThrow('Elasticsearch connection refused');
  });
});
