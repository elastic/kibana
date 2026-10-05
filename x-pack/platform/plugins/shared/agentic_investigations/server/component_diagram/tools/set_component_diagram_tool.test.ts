/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type {
  AgentBuilderPluginSetup,
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { createInMemoryStorage } from '../../investigation_attachments/in_memory_storage.mock';
import {
  COMPONENT_DIAGRAM_ATTACHMENT_TYPE,
  SET_COMPONENT_DIAGRAM_TOOL_ID,
} from '../../../common/component_diagram/constants';
import { componentDiagramAttachment, registerComponentDiagramAttachment } from '../attachments';
import {
  componentDiagramDocumentId,
  ComponentDiagramService,
} from '../services/component_diagram_service';
import type { ComponentDiagramDocument } from '../storage/component_diagram_storage';
import {
  createSetComponentDiagramTool,
  getComponentDiagramWarnings,
} from './set_component_diagram_tool';

const SPACE_ID = 'default';
const CONVERSATION_ID = 'conv-1';

const setup = ({
  assertCanManage = jest.fn().mockResolvedValue(undefined),
  stack = [{ type: 'agent', agentId: 'nightshift', conversationId: CONVERSATION_ID }],
}: { assertCanManage?: jest.Mock; stack?: object[] } = {}) => {
  const storage = createInMemoryStorage<ComponentDiagramDocument>();
  const service = new ComponentDiagramService({
    documents: componentDiagramAttachment.createServiceFromStorage(storage),
  });

  const registerType = jest.fn();
  registerComponentDiagramAttachment(
    { attachments: { registerType } } as unknown as AgentBuilderPluginSetup,
    {
      getComponentDiagramService: () => service,
      privileges: { assertCanManage: jest.fn(), assertCanRead: jest.fn() },
      assertCanReadConversation: jest.fn().mockResolvedValue(undefined),
      logger: loggerMock.create(),
    }
  );
  const definition = registerType.mock.calls[0][0] as AttachmentTypeDefinition;
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) =>
      type === COMPONENT_DIAGRAM_ATTACHMENT_TYPE ? definition : undefined,
  });

  const tool = createSetComponentDiagramTool({
    getComponentDiagramService: () => service,
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
      { id, type: COMPONENT_DIAGRAM_ATTACHMENT_TYPE, data },
      { request: httpServerMock.createKibanaRequest(), spaceId: SPACE_ID }
    );
    return JSON.stringify(await formatted.getRepresentation?.());
  };

  return { storage, attachments, tool, call, format };
};

const DIAGRAM_ID = componentDiagramDocumentId(SPACE_ID, CONVERSATION_ID);
const MERMAID =
  'flowchart LR\n  fe[frontend] -->|POST /checkout| orders[orders-api]\n  orders -.-> pg[(orders-db)]';

describe('investigations.set_component_diagram', () => {
  it('is the allow-listed builtin tool id', () => {
    expect(setup().tool.id).toBe(SET_COMPONENT_DIAGRAM_TOOL_ID);
  });

  it('writes the diagram and adds the hidden, by-reference attachment', async () => {
    const { storage, attachments, call } = setup();

    const result = await call({
      title: 'Checkout write path',
      mermaid: MERMAID,
      problem_node_ids: ['orders'],
      description: 'The pool is too small.',
    });

    expect(result.data).toEqual({ acknowledged: true, attachment_id: DIAGRAM_ID });
    expect(storage.entries.get(DIAGRAM_ID)?.source).toMatchObject({
      title: 'Checkout write path',
      mermaid: MERMAID,
      problemNodeIds: ['orders'],
      description: 'The pool is too small.',
    });
    expect(attachments.getAttachmentRecord(DIAGRAM_ID)).toMatchObject({
      type: COMPONENT_DIAGRAM_ATTACHMENT_TYPE,
      hidden: true,
    });
  });

  it('drops the fields a later call leaves out', async () => {
    const { storage, call } = setup();
    await call({ mermaid: MERMAID, description: 'first' });

    await call({ mermaid: MERMAID });

    expect(storage.entries.get(DIAGRAM_ID)?.source).not.toHaveProperty('description');
  });

  it('records the diagram but warns when it cannot be drawn', async () => {
    const { storage, call } = setup();

    const result = await call({ mermaid: 'sequenceDiagram\n  A->>B: hi' });

    expect(result.data).toMatchObject({
      warning: expect.stringContaining('not a Mermaid flowchart'),
    });
    expect(storage.entries.size).toBe(1);
  });

  it('formats the diagram for the agent as Mermaid', async () => {
    const { call, format } = setup();
    await call({ mermaid: MERMAID, problem_node_ids: ['orders'] });

    const text = await format(DIAGRAM_ID);

    expect(text).toContain('Problem nodes: orders');
    expect(text).toContain('```mermaid');
  });
});

describe('getComponentDiagramWarnings', () => {
  it('has nothing to say about a drawable diagram', () => {
    expect(getComponentDiagramWarnings({ mermaid: MERMAID, problem_node_ids: ['orders'] })).toEqual(
      []
    );
  });

  it('names problem nodes the diagram does not have and lines it cannot read', () => {
    expect(
      getComponentDiagramWarnings({
        mermaid: `${MERMAID}\n  orders --> [broken`,
        problem_node_ids: ['payments'],
      })
    ).toEqual([
      expect.stringContaining('"orders --> [broken"'),
      'problem_node_ids name nodes the diagram does not have: payments.',
    ]);
  });
});
