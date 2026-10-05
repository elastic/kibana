/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  AgentBuilderPluginSetup,
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { InvestigationsForbiddenError } from '../../investigations/services/investigations_forbidden_error';
import { createInMemoryStorage } from '../../investigation_attachments/in_memory_storage.mock';
import { SET_TIMELINE_TOOL_ID, TIMELINE_ATTACHMENT_TYPE } from '../../../common/timeline/constants';
import type { TimelineEvent } from '../../../common/timeline/timeline';
import { registerTimelineAttachment, timelineAttachment } from '../attachments';
import { timelineDocumentId, TimelineService } from '../services/timeline_service';
import type { TimelineDocument } from '../storage/timeline_storage';
import { createSetTimelineTool, REMOVED_TIMELINE_ATTACHMENT_NOTE } from './set_timeline_tool';

const SPACE_ID = 'default';
const CONVERSATION_ID = 'conv-1';

const setup = ({
  assertCanManage = jest.fn().mockResolvedValue(undefined),
  stack = [{ type: 'agent', agentId: 'nightshift', conversationId: CONVERSATION_ID }],
}: { assertCanManage?: jest.Mock; stack?: object[] } = {}) => {
  const storage = createInMemoryStorage<TimelineDocument>();
  const service = new TimelineService({
    documents: timelineAttachment.createServiceFromStorage(storage),
  });

  const registerType = jest.fn();
  registerTimelineAttachment(
    { attachments: { registerType } } as unknown as AgentBuilderPluginSetup,
    {
      getTimelineService: () => service,
      privileges: { assertCanManage: jest.fn(), assertCanRead: jest.fn() },
      assertCanReadConversation: jest.fn().mockResolvedValue(undefined),
      logger: loggerMock.create(),
    }
  );
  const definition = registerType.mock.calls[0][0] as AttachmentTypeDefinition;
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) => (type === TIMELINE_ATTACHMENT_TYPE ? definition : undefined),
  });

  const tool = createSetTimelineTool({
    getTimelineService: () => service,
    resolveUser: jest.fn().mockResolvedValue({ username: 'analyst', fullName: null, email: null }),
    privileges: { assertCanManage, assertCanRead: jest.fn() },
    logger: loggerMock.create(),
  });

  const context = {
    request: httpServerMock.createKibanaRequest(),
    spaceId: SPACE_ID,
    attachments,
    runContext: { runId: 'run-1', stack },
  } as unknown as ToolHandlerContext;

  const call = async (params: Parameters<typeof tool.handler>[0]) => {
    const { results } = (await tool.handler(params, context)) as ToolHandlerStandardReturn;
    return results[0];
  };

  const format = async (id: string) => {
    const data = { id, ...storage.entries.get(id)?.source };
    const formatted = await definition.format(
      { id, type: TIMELINE_ATTACHMENT_TYPE, data },
      { request: httpServerMock.createKibanaRequest(), spaceId: SPACE_ID }
    );
    return JSON.stringify(await formatted.getRepresentation?.());
  };

  return { storage, attachments, tool, call, format };
};

const TIMELINE_ID = timelineDocumentId(SPACE_ID, CONVERSATION_ID);

const deploy: TimelineEvent = {
  timestamp: '2026-07-28T14:00:00Z',
  title: 'checkout v2.3.1 deployed',
  type: 'change',
  entity: 'checkout',
};
const errors: TimelineEvent = {
  timestamp: '2026-07-28T14:02:00Z',
  title: 'Checkout errors rise',
  type: 'symptom',
  evidence: { description: 'Error rate went from 0.1% to 12%.' },
};

describe('investigations.set_timeline', () => {
  it('is the allow-listed builtin tool id', () => {
    expect(setup().tool.id).toBe(SET_TIMELINE_TOOL_ID);
  });

  it('writes the index and adds the hidden, by-reference timeline attachment', async () => {
    const { storage, attachments, call } = setup();

    const result = await call({ events: [errors, deploy] });

    expect(result).toMatchObject({
      type: ToolResultType.other,
      data: { acknowledged: true, attachment_id: TIMELINE_ID },
    });
    expect(storage.entries.get(TIMELINE_ID)?.source).toMatchObject({
      conversationId: CONVERSATION_ID,
      events: [errors, deploy],
      createdBy: { username: 'analyst' },
    });
    expect(attachments.getAttachmentRecord(TIMELINE_ID)).toMatchObject({
      type: TIMELINE_ATTACHMENT_TYPE,
      origin: TIMELINE_ID,
      readonly: true,
      hidden: true,
    });
  });

  it('replaces the events on every call', async () => {
    const { storage, call } = setup();
    await call({ events: [deploy, errors] });

    await call({ events: [deploy] });

    expect(storage.entries.get(TIMELINE_ID)?.source.events).toEqual([deploy]);
  });

  it('records but does not re-add a timeline the user removed', async () => {
    const { storage, attachments, call } = setup();
    await call({ events: [deploy] });
    attachments.delete(TIMELINE_ID);

    const result = await call({ events: [deploy, errors] });

    expect(result.data).toMatchObject({ warning: REMOVED_TIMELINE_ATTACHMENT_NOTE });
    expect(storage.entries.get(TIMELINE_ID)?.source.events).toHaveLength(2);
  });

  it('refuses to write without the investigations manage privilege', async () => {
    const { storage, call } = setup({
      assertCanManage: jest.fn().mockRejectedValue(new InvestigationsForbiddenError('Missing')),
    });

    expect((await call({ events: [deploy] })).type).toBe(ToolResultType.error);
    expect(storage.entries.size).toBe(0);
  });

  it('formats the events for the agent in time order', async () => {
    const { call, format } = setup();
    await call({ events: [errors, deploy] });

    const text = await format(TIMELINE_ID);

    expect(text.indexOf('checkout v2.3.1 deployed')).toBeLessThan(text.indexOf('Checkout errors'));
    expect(text).toContain('[change] checkout:');
    expect(text).toContain('Error rate went from 0.1% to 12%.');
  });
});
