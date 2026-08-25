/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, registeredViewIds } from '../../common/constants';
import { createAdaptiveUiViewRegistry } from '../registered_views';
import { requestRegisteredViewTool } from './request_registered_view';

type Handler = ReturnType<typeof requestRegisteredViewTool>['handler'];

const liveEvent: SignificantEvent = {
  event_id: 'evt-003',
  event_uuid: 'evt-003-v1',
  '@timestamp': '2026-08-25T13:49:13.000Z',
  title: 'Elasticsearch cluster — disk watermark write throttling',
  summary: 'Disk usage crossed the 85% high watermark.',
  status: 'open',
  severity: '80-critical',
  confidence: 0.91,
  stream_names: ['logs.elasticsearch'],
};

const runContext = {
  runId: 'run-1',
  stack: [{ type: 'agent', agentId: 'a', conversationId: 'conv-1', executionId: 'exec-1' }],
};

const createContext = (add = jest.fn()) =>
  ({
    attachments: { add },
    logger: { debug: jest.fn(), error: jest.fn() },
    request: {},
    runContext,
  } as unknown as Parameters<Handler>[1]);

const createTool = (getEventById = jest.fn().mockResolvedValue(liveEvent)) =>
  requestRegisteredViewTool({
    registry: createAdaptiveUiViewRegistry(),
    getSignificantEvents: async () => ({ getEventById }),
    getNightshiftInvestigations: async () => undefined,
  });

describe('requestRegisteredViewTool', () => {
  it('persists a live significant event as an attachment', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'att-1', current_version: 1 });
    const getEventById = jest.fn().mockResolvedValue(liveEvent);
    const tool = createTool(getEventById);

    const result = await tool.handler(
      { viewId: registeredViewIds.significantEvent, input: { event_id: 'evt-003' } },
      createContext(add)
    );

    expect(getEventById).toHaveBeenCalledWith({}, 'evt-003');
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
        data: expect.objectContaining({ title: liveEvent.title }),
      }),
      ATTACHMENT_REF_ACTOR.agent
    );
    expect('results' in result && result.results[0]).toMatchObject({
      type: ToolResultType.other,
      data: {
        attachment_id: 'att-1',
        view_id: registeredViewIds.significantEvent,
        title: liveEvent.title,
      },
    });
  });

  it('returns an error and does not persist when the view id is unknown', async () => {
    const add = jest.fn();
    const tool = createTool();

    const result = await tool.handler({ viewId: 'does.not.exist' }, createContext(add));

    expect(add).not.toHaveBeenCalled();
    expect('results' in result && result.results[0].type).toBe(ToolResultType.error);
  });

  it('returns an error instead of sample data when event_id is omitted', async () => {
    const add = jest.fn();
    const tool = createTool();

    const result = await tool.handler(
      { viewId: registeredViewIds.significantEvent },
      createContext(add)
    );

    expect(add).not.toHaveBeenCalled();
    expect('results' in result && result.results[0]).toMatchObject({
      type: ToolResultType.error,
      data: { message: expect.stringContaining('event_id') },
    });
  });
});
