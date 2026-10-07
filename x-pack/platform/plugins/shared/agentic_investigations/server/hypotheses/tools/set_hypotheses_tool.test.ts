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
import {
  HYPOTHESES_ATTACHMENT_TYPE,
  SET_HYPOTHESES_TOOL_ID,
} from '../../../common/hypotheses/constants';
import type { Hypothesis } from '../../../common/hypotheses/hypotheses';
import { ImpactForbiddenError } from '../../impact/services/errors';
import type { ImpactPrivilegesChecker } from '../../impact/services/check_impact_privileges';
import { createInMemoryStorage } from '../../investigation_attachments/in_memory_storage.mock';
import { hypothesesAttachment, registerHypothesesAttachment } from '../attachments';
import { hypothesesDocumentId, HypothesesService } from '../services/hypotheses_service';
import type { HypothesesDocument } from '../storage/hypotheses_storage';
import {
  createSetHypothesesTool,
  MULTIPLE_CONFIRMED_WARNING,
  REMOVED_HYPOTHESES_ATTACHMENT_NOTE,
} from './set_hypotheses_tool';

const SPACE_ID = 'default';
const CONVERSATION_ID = 'conv-1';
const HYPOTHESES_ID = hypothesesDocumentId(SPACE_ID, CONVERSATION_ID);

const deploy: Hypothesis = {
  candidate: 'The 14:00 deploy introduced a slow query',
  confidence: 0.8,
  status: 'confirmed',
  reason: 'Latency rose with the deploy.',
  evidence: [
    {
      description: 'p99 doubled',
      chart: {
        type: 'line',
        title: 'p99 latency',
        x_axis: { type: 'time' },
        y_axis: { unit: 'ms' },
        series: [{ name: 'checkout', points: [{ x: '2026-07-28T14:00:00Z', y: 900 }] }],
      },
    },
  ],
};
const network: Hypothesis = {
  candidate: 'Network saturation',
  confidence: 0.1,
  status: 'dismissed',
};

const setup = ({
  assertCanManage = jest.fn().mockResolvedValue(undefined),
  stack = [{ type: 'agent', agentId: 'nightshift', conversationId: CONVERSATION_ID }],
}: { assertCanManage?: jest.Mock; stack?: object[] } = {}) => {
  const storage = createInMemoryStorage<HypothesesDocument>();
  const service = new HypothesesService({
    documents: hypothesesAttachment.createServiceFromStorage(storage),
  });

  const registerType = jest.fn();
  registerHypothesesAttachment(
    { attachments: { registerType } } as unknown as AgentBuilderPluginSetup,
    {
      getHypothesesService: () => service,
      privileges: { assertCanManage: jest.fn(), assertCanRead: jest.fn() },
      logger: loggerMock.create(),
    }
  );
  const definition = registerType.mock.calls[0][0] as AttachmentTypeDefinition;
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) => (type === HYPOTHESES_ATTACHMENT_TYPE ? definition : undefined),
  });

  const privileges: ImpactPrivilegesChecker = { assertCanManage, assertCanRead: jest.fn() };
  const tool = createSetHypothesesTool({
    getHypothesesService: () => service,
    resolveUser: jest.fn().mockResolvedValue({ username: 'analyst', fullName: null, email: null }),
    privileges,
    logger: loggerMock.create(),
  });

  const context = {
    request: httpServerMock.createKibanaRequest(),
    spaceId: SPACE_ID,
    attachments,
    runContext: { runId: 'run-1', stack },
  } as unknown as ToolHandlerContext;

  const call = async (hypotheses: Hypothesis[]) => {
    const { results } = (await tool.handler({ hypotheses }, context)) as ToolHandlerStandardReturn;
    return results[0];
  };

  return { storage, attachments, tool, call, definition };
};

describe('agentic_investigations.set_hypotheses', () => {
  it('is the allow-listed builtin tool id', () => {
    expect(setup().tool.id).toBe(SET_HYPOTHESES_TOOL_ID);
  });

  it('writes the index and adds the by-reference hypotheses attachment', async () => {
    const { storage, attachments, call } = setup();

    const result = await call([deploy, network]);

    expect(result).toMatchObject({
      type: ToolResultType.other,
      data: { acknowledged: true, attachment_id: HYPOTHESES_ID },
    });
    expect(result.data).not.toHaveProperty('warning');
    expect(storage.entries.get(HYPOTHESES_ID)?.source).toMatchObject({
      conversationId: CONVERSATION_ID,
      hypotheses: [deploy, network],
      createdBy: { username: 'analyst' },
    });
    expect(attachments.getAttachmentRecord(HYPOTHESES_ID)).toMatchObject({
      type: HYPOTHESES_ATTACHMENT_TYPE,
      origin: HYPOTHESES_ID,
      readonly: true,
      active: true,
      hidden: true,
    });
    expect(attachments.drainChanges()).toEqual([]);
  });

  it('does not ask the agent to render the hypotheses inline', async () => {
    const { definition } = setup();

    expect(await definition.getAgentDescription?.()).not.toContain('render_attachment');
  });

  it('replaces the whole list on every call and versions the attachment', async () => {
    const { storage, attachments, call } = setup();
    await call([deploy, network]);
    const { createdAt } = storage.entries.get(HYPOTHESES_ID)?.source ?? {};

    await call([{ ...network, status: 'investigating' }]);

    expect(storage.entries.get(HYPOTHESES_ID)?.source).toMatchObject({
      hypotheses: [{ ...network, status: 'investigating' }],
      createdAt,
    });
    const record = attachments.getAttachmentRecord(HYPOTHESES_ID);
    expect(record?.current_version).toBe(2);
  });

  it('warns when more than one hypothesis is confirmed', async () => {
    const { call } = setup();

    const result = await call([deploy, { ...network, status: 'confirmed' }]);

    expect(result.data).toMatchObject({ acknowledged: true, warning: MULTIPLE_CONFIRMED_WARNING });
  });

  it('records but does not re-add hypotheses the user removed', async () => {
    const { storage, attachments, call } = setup();
    await call([deploy]);
    attachments.delete(HYPOTHESES_ID);

    const result = await call([network]);

    expect(result.data).toMatchObject({ warning: REMOVED_HYPOTHESES_ATTACHMENT_NOTE });
    expect(storage.entries.get(HYPOTHESES_ID)?.source.hypotheses).toEqual([network]);
    expect(attachments.getAttachmentRecord(HYPOTHESES_ID)?.active).toBe(false);
  });

  it('refuses to write without the investigations manage privilege', async () => {
    const { storage, call } = setup({
      assertCanManage: jest.fn().mockRejectedValue(new ImpactForbiddenError('Missing privilege')),
    });

    const result = await call([deploy]);

    expect(result.type).toBe(ToolResultType.error);
    expect(storage.entries.size).toBe(0);
  });

  it('refuses to run outside a conversation', async () => {
    const { storage, call } = setup({ stack: [{ type: 'agent', agentId: 'nightshift' }] });

    const result = await call([deploy]);

    expect(result.type).toBe(ToolResultType.error);
    expect(storage.entries.size).toBe(0);
  });

  it('formats the hypotheses for the agent without raw chart points', async () => {
    const { definition, call, storage } = setup();
    await call([deploy, network]);
    const data = { id: HYPOTHESES_ID, ...storage.entries.get(HYPOTHESES_ID)?.source };

    const formatted = await definition.format(
      { id: HYPOTHESES_ID, type: HYPOTHESES_ATTACHMENT_TYPE, data },
      { request: httpServerMock.createKibanaRequest(), spaceId: SPACE_ID }
    );
    const representation = await formatted.getRepresentation?.();

    expect(representation).toEqual({
      type: 'text',
      value: expect.stringContaining('[confirmed, confidence 80%] The 14:00 deploy'),
    });
    expect(JSON.stringify(representation)).toContain('[dismissed, confidence 10%]');
    expect(JSON.stringify(representation)).not.toContain('2026-07-28T14:00:00Z');
  });
});
