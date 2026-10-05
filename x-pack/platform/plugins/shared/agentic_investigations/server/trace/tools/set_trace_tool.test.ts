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
import { createInMemoryStorage } from '../../investigation_attachments/in_memory_storage.mock';
import { SET_TRACE_TOOL_ID, TRACE_ATTACHMENT_TYPE } from '../../../common/trace/constants';
import type { TraceStep } from '../../../common/trace/trace';
import { registerTraceAttachment, traceAttachment } from '../attachments';
import { traceDocumentId, TraceService } from '../services/trace_service';
import type { TraceDocument } from '../storage/trace_storage';
import { createSetTraceTool, REMOVED_TRACE_ATTACHMENT_NOTE } from './set_trace_tool';

const SPACE_ID = 'default';
const CONVERSATION_ID = 'conv-1';

const setup = ({
  assertCanManage = jest.fn().mockResolvedValue(undefined),
  stack = [{ type: 'agent', agentId: 'nightshift', conversationId: CONVERSATION_ID }],
}: { assertCanManage?: jest.Mock; stack?: object[] } = {}) => {
  const storage = createInMemoryStorage<TraceDocument>();
  const service = new TraceService({
    documents: traceAttachment.createServiceFromStorage(storage),
  });

  const registerType = jest.fn();
  registerTraceAttachment({ attachments: { registerType } } as unknown as AgentBuilderPluginSetup, {
    getTraceService: () => service,
    privileges: { assertCanManage: jest.fn(), assertCanRead: jest.fn() },
    assertCanReadConversation: jest.fn().mockResolvedValue(undefined),
    logger: loggerMock.create(),
  });
  const definition = registerType.mock.calls[0][0] as AttachmentTypeDefinition;
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) => (type === TRACE_ATTACHMENT_TYPE ? definition : undefined),
  });

  const tool = createSetTraceTool({
    getTraceService: () => service,
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
      { id, type: TRACE_ATTACHMENT_TYPE, data },
      { request: httpServerMock.createKibanaRequest(), spaceId: SPACE_ID }
    );
    return JSON.stringify(await formatted.getRepresentation?.());
  };

  return { storage, attachments, tool, call, format };
};

const TRACE_ID = traceDocumentId(SPACE_ID, CONVERSATION_ID);

const steps: TraceStep[] = [
  { type: 'symptom', label: 'Checkout errors at 12%', decision_tree_node: 'S1' },
  {
    type: 'evidence_gatherer',
    label: 'Split errors by version',
    method: '```esql\nFROM traces-*\n```',
    finding: 'Only v2.3.1 fails.',
    outcome: 'only the new version',
  },
  { type: 'end', label: 'Root cause: pool size' },
];

describe('investigations.set_trace', () => {
  it('is the allow-listed builtin tool id', () => {
    expect(setup().tool.id).toBe(SET_TRACE_TOOL_ID);
  });

  it('writes the steps and the decision tree, and adds the hidden attachment', async () => {
    const { storage, attachments, call } = setup();

    const result = await call({ steps, decision_tree: 'checkout-errors.md' });

    expect(result.data).toEqual({ acknowledged: true, attachment_id: TRACE_ID });
    expect(storage.entries.get(TRACE_ID)?.source).toMatchObject({
      steps,
      decisionTree: 'checkout-errors.md',
    });
    expect(attachments.getAttachmentRecord(TRACE_ID)).toMatchObject({
      type: TRACE_ATTACHMENT_TYPE,
      hidden: true,
    });
  });

  it('records but does not re-add a trace the user removed', async () => {
    const { attachments, call } = setup();
    await call({ steps });
    attachments.delete(TRACE_ID);

    expect((await call({ steps })).data).toMatchObject({ warning: REMOVED_TRACE_ATTACHMENT_NOTE });
  });

  it('refuses to run outside a conversation', async () => {
    const { storage, call } = setup({ stack: [{ type: 'agent', agentId: 'nightshift' }] });

    expect((await call({ steps })).type).toBe(ToolResultType.error);
    expect(storage.entries.size).toBe(0);
  });

  it('formats the route for the agent, step by step', async () => {
    const { call, format } = setup();
    await call({ steps, decision_tree: 'checkout-errors.md' });

    const text = await format(TRACE_ID);

    expect(text).toContain('Decision tree: checkout-errors.md');
    expect(text).toContain('1. [symptom, tree node S1] Checkout errors at 12%');
    expect(text).toContain('Outcome: only the new version');
  });
});
