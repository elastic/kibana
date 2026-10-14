/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ConversationMetadataPatchedEvent } from '@kbn/agent-builder-server';
import {
  registerMetadataChangeEvents,
  toTimelineEvents,
  waitForMetadataChangeEvents,
} from './metadata_change_events';

const patched = (
  overrides: Partial<ConversationMetadataPatchedEvent>
): ConversationMetadataPatchedEvent => ({
  conversationId: 'conv-1',
  templateId: 'investigation',
  changedFields: Object.keys(overrides.changes ?? {}),
  changes: {},
  source: 'http_api',
  ...overrides,
});

describe('toTimelineEvents', () => {
  it('maps a status change', () => {
    expect(
      toTimelineEvents(patched({ changes: { status: { from: 'open', to: 'closed' } } }))
    ).toEqual([{ type: 'status_changed', data: { from: 'open', to: 'closed' } }]);
  });

  it('omits from when there was no previous status, and carries the automation context', () => {
    const context = { type: 'agent' as const, agent_id: 'a1', execution_id: 'e1' };

    expect(
      toTimelineEvents(
        patched({ templateId: 'escalation', changes: { status: { to: 'open' } }, context })
      )
    ).toEqual([{ type: 'status_changed', data: { to: 'open', via: context } }]);
  });

  it('keeps every field of a workflow context on both event types', () => {
    const context = {
      type: 'workflow' as const,
      workflow_id: 'wf-1',
      workflow_name: 'Triage',
      execution_id: 'exec-1',
    };

    expect(
      toTimelineEvents(
        patched({
          changes: { status: { from: 'open', to: 'closed' }, assignees: { to: ['a'] } },
          context,
        })
      )
    ).toEqual([
      { type: 'status_changed', data: { from: 'open', to: 'closed', via: context } },
      { type: 'assignees_changed', data: { added: ['a'], removed: [], via: context } },
    ]);
  });

  it('ignores statuses it cannot render', () => {
    expect(
      toTimelineEvents(patched({ changes: { status: { from: 'open', to: 'weird' } } }))
    ).toEqual([]);
  });

  it('maps assignee additions and removals', () => {
    expect(
      toTimelineEvents(patched({ changes: { assignees: { from: ['a', 'b'], to: ['b', 'c'] } } }))
    ).toEqual([{ type: 'assignees_changed', data: { added: ['c'], removed: ['a'] } }]);
  });

  it('handles a single-value or absent serialized array', () => {
    expect(toTimelineEvents(patched({ changes: { assignees: { to: 'a' } } }))).toEqual([
      { type: 'assignees_changed', data: { added: ['a'], removed: [] } },
    ]);
    expect(toTimelineEvents(patched({ changes: { assignees: { from: 'a' } } }))).toEqual([
      { type: 'assignees_changed', data: { added: [], removed: ['a'] } },
    ]);
  });

  it('skips a reordered assignee list with nobody added or removed', () => {
    expect(
      toTimelineEvents(patched({ changes: { assignees: { from: ['a', 'b'], to: ['b', 'a'] } } }))
    ).toEqual([]);
  });

  it('writes both events when both fields changed', () => {
    expect(
      toTimelineEvents(
        patched({
          changes: {
            status: { from: 'closed', to: 'open' },
            assignees: { to: ['a'] },
          },
        })
      ).map(({ type }) => type)
    ).toEqual(['status_changed', 'assignees_changed']);
  });

  it('ignores other templates and other fields', () => {
    expect(
      toTimelineEvents(patched({ templateId: 'other', changes: { status: { to: 'closed' } } }))
    ).toEqual([]);
    expect(
      toTimelineEvents(patched({ templateId: undefined, changes: { status: { to: 'closed' } } }))
    ).toEqual([]);
    expect(toTimelineEvents(patched({ changes: { severity: { to: 'high' } } }))).toEqual([]);
  });
});

describe('registerMetadataChangeEvents', () => {
  const setup = (addEvents = jest.fn().mockResolvedValue([])) => {
    const listeners: Array<(request: unknown, event: ConversationMetadataPatchedEvent) => void> =
      [];
    const agentBuilder = {
      conversationEvents: { register: jest.fn() },
      conversations: { onMetadataPatched: jest.fn((listener) => listeners.push(listener)) },
    };
    const getConversationClient = jest.fn().mockResolvedValue({ addEvents });
    const logger = loggingSystemMock.createLogger();
    registerMetadataChangeEvents({
      agentBuilder: agentBuilder as never,
      getConversationClient,
      logger,
    });
    return { agentBuilder, listener: listeners[0], getConversationClient, addEvents, logger };
  };

  it('registers the status event type', () => {
    const { agentBuilder } = setup();

    expect(agentBuilder.conversationEvents.register).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'status_changed' })
    );
  });

  it('writes the events with the request that made the change', async () => {
    const { listener, getConversationClient, addEvents } = setup();
    const request = httpServerMock.createKibanaRequest();

    listener(request, patched({ changes: { status: { from: 'open', to: 'closed' } } }));
    await new Promise(process.nextTick);

    expect(getConversationClient).toHaveBeenCalledWith(request);
    expect(addEvents).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      events: [{ type: 'status_changed', data: { from: 'open', to: 'closed' } }],
    });
  });

  it('does nothing for unrelated changes', async () => {
    const { listener, getConversationClient } = setup();

    listener(
      httpServerMock.createKibanaRequest(),
      patched({ changes: { severity: { to: 'high' } } })
    );
    await new Promise(process.nextTick);

    expect(getConversationClient).not.toHaveBeenCalled();
  });

  it('retries a transient failure and stores the events', async () => {
    const addEvents = jest
      .fn()
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValue([]);
    const { listener, logger } = setup(addEvents);
    const request = httpServerMock.createKibanaRequest();

    listener(request, patched({ changes: { status: { to: 'closed' } } }));
    await waitForMetadataChangeEvents(request);

    expect(addEvents).toHaveBeenCalledTimes(2);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not retry a rejected write', async () => {
    const addEvents = jest
      .fn()
      .mockRejectedValue(Object.assign(new Error('no'), { statusCode: 403 }));
    const { listener, logger } = setup(addEvents);
    const request = httpServerMock.createKibanaRequest();

    listener(request, patched({ changes: { status: { to: 'closed' } } }));
    await waitForMetadataChangeEvents(request);

    expect(addEvents).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no'));
  });

  it('logs a warning when the event cannot be written', async () => {
    const { listener, logger } = setup(jest.fn().mockRejectedValue(new Error('denied')));

    const request = httpServerMock.createKibanaRequest();
    listener(request, patched({ changes: { status: { to: 'closed' } } }));
    await waitForMetadataChangeEvents(request);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('denied'));
  });

  describe('waitForMetadataChangeEvents', () => {
    it('resolves once the write of the same request is stored, without blocking the listener', async () => {
      let finishWrite!: () => void;
      const { listener, addEvents } = setup(
        jest.fn().mockReturnValue(new Promise<void>((resolve) => (finishWrite = resolve)))
      );
      const request = httpServerMock.createKibanaRequest();

      listener(request, patched({ changes: { status: { from: 'open', to: 'closed' } } }));

      let waited = false;
      const waiting = waitForMetadataChangeEvents(request).then(() => (waited = true));
      await new Promise(process.nextTick);
      expect(addEvents).toHaveBeenCalled();
      expect(waited).toBe(false);

      finishWrite();
      await waiting;
      expect(waited).toBe(true);
    });

    it('resolves even when the write failed, and ignores other requests', async () => {
      const { listener } = setup(jest.fn().mockRejectedValue(new Error('denied')));
      const request = httpServerMock.createKibanaRequest();

      listener(request, patched({ changes: { status: { to: 'closed' } } }));

      await expect(waitForMetadataChangeEvents(request)).resolves.toBeUndefined();
      await expect(
        waitForMetadataChangeEvents(httpServerMock.createKibanaRequest())
      ).resolves.toBeUndefined();
    });
  });
});
