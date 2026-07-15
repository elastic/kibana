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
  summary: 'P99 latency breached SLO',
  root_cause: 'Connection pool exhaustion',
  criticality: 80,
  confidence: 0.8,
  recommendations: ['Increase pool size'],
  cause_kis: [],
  dependency_edges: [],
  infra_components: [],
};

describe('createEventToolHandler', () => {
  beforeEach(() => {
    (eventsWriteHandler as jest.Mock).mockResolvedValue({
      event_id: 'event-1',
      discovery_slug: 'agent-event-abcd1234',
      status: 'promoted',
      written: true,
    });
  });

  it('defaults status to "promoted" when omitted', async () => {
    await createEventToolHandler({ eventClient: {} as never, eventInput: baseInput });

    expect(eventsWriteHandler).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ status: 'promoted' }) })
    );
  });

  it('passes explicit status through', async () => {
    await createEventToolHandler({
      eventClient: {} as never,
      eventInput: { ...baseInput, status: 'acknowledged' },
    });

    expect(eventsWriteHandler).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ status: 'acknowledged' }) })
    );
  });

  it('returns event_id from the write result and acknowledged: true', async () => {
    const result = await createEventToolHandler({
      eventClient: {} as never,
      eventInput: baseInput,
    });

    expect(result).toEqual({ event_id: 'event-1', acknowledged: true });
  });

  it('omits discovery_slug from the delegated call — synthetic slug path always used', async () => {
    await createEventToolHandler({ eventClient: {} as never, eventInput: baseInput });

    const delegatedInput = (eventsWriteHandler as jest.Mock).mock.calls[0][0].input;
    expect(delegatedInput).not.toHaveProperty('discovery_slug');
    expect(delegatedInput).not.toHaveProperty('discovery_id');
    expect(delegatedInput).not.toHaveProperty('assessment_note');
    expect(delegatedInput).not.toHaveProperty('evidences');
    expect(delegatedInput).not.toHaveProperty('workflow_execution_id');
  });
});
