/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import type { GetScopedClients } from '../../../routes/types';
import type { StreamsServer } from '../../../types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createEventToolHandler } from './handler';
import { createEventTool, STREAMS_CREATE_EVENT_TOOL_ID } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('./handler', () => ({
  createEventToolHandler: jest.fn(),
}));

describe('event_create tool', () => {
  const logger = loggingSystemMock.createLogger();
  const server = {} as unknown as StreamsServer;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses expected tool id', () => {
    const getScopedClients = jest.fn() as unknown as jest.MockedFunction<GetScopedClients>;
    const tool = createEventTool({ getScopedClients, server, logger });

    expect(tool.id).toBe(STREAMS_CREATE_EVENT_TOOL_ID);
    expect(tool.id).toBe('platform.streams.sig_events.event_create');
  });

  it('uses always confirmation policy with custom prompt', async () => {
    const getScopedClients = jest.fn() as unknown as jest.MockedFunction<GetScopedClients>;
    const tool = createEventTool({ getScopedClients, server, logger });

    expect(tool.confirmation?.askUser).toBe('always');

    const confirmation = await tool.confirmation?.getConfirmation?.({
      toolParams: {
        verdict: 'promoted',
        title: 'Checkout timeout spike',
        summary: 'Spike of timeouts',
        root_cause: 'Latency',
        stream_names: ['logs.checkout', 'logs.payment'],
        criticality: 0.86,
        impact: 'Checkout failures',
      },
    });

    expect(confirmation).toEqual(
      expect.objectContaining({
        title: 'Create Significant Event',
        confirm_text: 'Create',
        cancel_text: 'Cancel',
      })
    );
    expect(confirmation?.message).toContain('Checkout timeout spike');
    expect(confirmation?.message).toContain('promoted');
    expect(confirmation?.message).toContain('logs.checkout, logs.payment');
  });

  it('returns created event on success', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (createEventToolHandler as jest.Mock).mockResolvedValue({ event: { id: 'e1' } });

    const getScopedClients = jest.fn().mockResolvedValue({
      eventsClient: {},
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createEventTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server,
      logger,
    });

    const result = await invokeHandler(
      tool as never,
      {
        verdict: 'promoted',
        title: 'T',
        summary: 'S',
        root_cause: 'R',
        stream_names: ['logs.a'],
        criticality: 0.6,
        impact: 'I',
      },
      createMockToolContext()
    );

    expect(assertSignificantEventsAccess).toHaveBeenCalled();
    expect(createEventToolHandler).toHaveBeenCalled();
    expect(result.results[0].type).toBe('other');
  });

  it('returns error result when creation fails', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (createEventToolHandler as jest.Mock).mockRejectedValue(new Error('boom'));

    const getScopedClients = jest.fn().mockResolvedValue({
      eventsClient: {},
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createEventTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server,
      logger,
    });

    const result = await invokeHandler(
      tool as never,
      {
        verdict: 'promoted',
        title: 'T',
        summary: 'S',
        root_cause: 'R',
        stream_names: ['logs.a'],
        criticality: 0.6,
        impact: 'I',
      },
      createMockToolContext()
    );

    expect(result.results[0].type).toBe('error');
    expect((result.results[0].data as { message: string }).message).toContain(
      'Failed to create significant event'
    );
  });
});
