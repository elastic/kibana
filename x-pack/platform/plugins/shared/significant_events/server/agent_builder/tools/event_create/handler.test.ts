/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEventToolHandler } from './handler';
import { eventsWriteHandler } from '../event_write/handler';

jest.mock('../event_write/handler', () => ({
  eventsWriteHandler: jest.fn(),
}));

const baseInput = {
  stream_names: ['logs.checkout'],
  title: 'Checkout latency',
  symptom_hypothesis: 'Checkout requests are delayed because the payment dependency is timing out.',
  summary: 'P99 latency breached SLO',
  severity: '60-high' as const,
  confidence: 0.8,
};

describe('createEventToolHandler', () => {
  beforeEach(() => {
    (eventsWriteHandler as jest.Mock).mockResolvedValue({
      event_uuid: 'event-1',
      event_id: 'agent-event-abcd1234',
      status: 'open',
      written: true,
    });
  });

  it('defaults status to "open" when omitted', async () => {
    await createEventToolHandler({ eventClient: {} as never, eventInput: baseInput });

    expect(eventsWriteHandler).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ status: 'open' }) })
    );
  });

  it('passes explicit status through', async () => {
    await createEventToolHandler({
      eventClient: {} as never,
      eventInput: { ...baseInput, status: 'dismissed' as const },
    });

    expect(eventsWriteHandler).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ status: 'dismissed' }) })
    );
  });

  it('returns event_uuid from the write result and acknowledged: true', async () => {
    const result = await createEventToolHandler({
      eventClient: {} as never,
      eventInput: baseInput,
    });

    expect(result).toEqual({ event_uuid: 'event-1', acknowledged: true });
  });

  it('does not include event_id — synthetic slug path always used', async () => {
    await createEventToolHandler({ eventClient: {} as never, eventInput: baseInput });

    const delegatedInput = (eventsWriteHandler as jest.Mock).mock.calls[0][0].input;
    expect(delegatedInput).not.toHaveProperty('event_id');
    expect(delegatedInput).not.toHaveProperty('discovery_id');
    expect(delegatedInput).not.toHaveProperty('assessment_note');
    expect(delegatedInput).not.toHaveProperty('signals');
    expect(delegatedInput).not.toHaveProperty('workflow_execution_id');
  });
});
