/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { createCasesClientMock, type CasesClientMock } from '../../client/mocks';
import type { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';
import { attachmentsTool } from './attachment_tools';

const buildMockAttachments = () => ({
  add: jest.fn().mockResolvedValue({ id: 'att-1' }),
  get: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  list: jest.fn(),
});

const buildToolContext = (attachments = buildMockAttachments()): ToolHandlerContext =>
  ({
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    logger: loggingSystemMock.createLogger(),
    attachments,
  } as unknown as ToolHandlerContext);

const buildRegistry = (
  entries: Array<{ id: string; schema?: z.ZodType }>
): UnifiedAttachmentTypeRegistry =>
  ({ list: () => entries } as unknown as UnifiedAttachmentTypeRegistry);

// A minimal authorable attachment schema: discriminated by `type`, with an
// `owner` key the step strips before composing the union.
const commentSchema = z.object({
  type: z.literal('comment'),
  owner: z.string(),
  data: z.object({ content: z.string() }),
});

describe('attachmentsTool — add_attachments mode', () => {
  let casesClient: CasesClientMock;

  beforeEach(() => {
    casesClient = createCasesClientMock();
  });

  const buildTool = (registry: UnifiedAttachmentTypeRegistry, enabled: boolean) =>
    attachmentsTool(jest.fn().mockResolvedValue(casesClient), registry, enabled);

  it('surfaces registered authorable type ids in the attachments field description', () => {
    const dashboardSchema = z.object({ type: z.literal('dashboard'), owner: z.string() });
    const tool = buildTool(
      buildRegistry([
        { id: 'comment', schema: commentSchema },
        { id: 'dashboard', schema: dashboardSchema },
      ]),
      true
    );
    const description = tool.schema.shape.attachments.description ?? '';
    expect(description).toContain('comment');
    expect(description).toContain('dashboard');
  });

  it('throws when attachments are disabled', async () => {
    const tool = buildTool(buildRegistry([{ id: 'comment', schema: commentSchema }]), false);
    await expect(
      tool.handler(
        { mode: 'add_attachments', case_id: 'case-1', attachments: [{ type: 'comment' }] } as never,
        buildToolContext()
      )
    ).rejects.toThrow(/disabled/i);
  });

  it('throws when no authorable attachment types are registered', async () => {
    const tool = buildTool(buildRegistry([]), true);
    await expect(
      tool.handler(
        { mode: 'add_attachments', case_id: 'case-1', attachments: [{ type: 'comment' }] } as never,
        buildToolContext()
      )
    ).rejects.toThrow(/no authorable attachment types/i);
  });

  it('bulk-creates attachments and emits a case attachment when enabled', async () => {
    const theCase = {
      id: 'case-1',
      title: 'Test Case',
      description: 'desc',
      status: 'open',
      severity: 'low',
      owner: 'securitySolution',
      tags: [],
      assignees: [],
      totalAlerts: 0,
      totalComment: 1,
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: null,
    };
    casesClient.cases.get.mockResolvedValue(theCase as never);
    casesClient.attachments.bulkCreate.mockResolvedValue(theCase as never);

    const attachments = buildMockAttachments();
    const tool = buildTool(buildRegistry([{ id: 'comment', schema: commentSchema }]), true);
    const result = await tool.handler(
      {
        mode: 'add_attachments',
        case_id: 'case-1',
        attachments: [{ type: 'comment', data: { content: 'hi' } }],
      } as never,
      buildToolContext(attachments)
    );

    expect(casesClient.attachments.bulkCreate).toHaveBeenCalledWith({
      caseId: 'case-1',
      attachments: [{ type: 'comment', data: { content: 'hi' }, owner: 'securitySolution' }],
    });
    expect(attachments.add).toHaveBeenCalledTimes(1);
    const { results } = result as unknown as { results: Array<{ data: Record<string, unknown> }> };
    expect(results[0].data.attachment_ids).toEqual(['att-1']);
  });
});
