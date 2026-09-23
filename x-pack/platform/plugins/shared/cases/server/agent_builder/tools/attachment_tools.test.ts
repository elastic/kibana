/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AvailabilityContext } from '@kbn/agent-builder-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { createCasesClientMock, type CasesClientMock } from '../../client/mocks';
import type { UnifiedAttachmentTypeRegistry } from '../../attachment_framework/unified_attachment_registry';
import { attachmentsTool } from './attachment_tools';
import { makeCoreWithSolution } from '../utils/mock_core_with_solution';
import { createCasesToolAvailability } from '../utils/get_cases_tool_availability';

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

const commentSchema = z.object({
  type: z.literal('comment'),
  owner: z.string(),
  data: z.object({ content: z.string() }),
});

describe('attachmentsTool (deprecated)', () => {
  let casesClient: CasesClientMock;

  beforeEach(() => {
    casesClient = createCasesClientMock();
  });

  const buildTool = (registry: UnifiedAttachmentTypeRegistry, enabled: boolean) => {
    return attachmentsTool(jest.fn().mockResolvedValue(casesClient), registry, enabled);
  };

  it('has a description that directs agents to the replacement tools', () => {
    const tool = buildTool(buildRegistry([]), true);
    expect(tool.description).toContain('DEPRECATED');
    expect(tool.description).toContain('platform.core.cases.get_attachments');
    expect(tool.description).toContain('platform.core.cases.manage_attachments');
    expect(tool.description).toContain('retrieve attachments');
    expect(tool.description).toContain('add attachments');
  });

  it('uses the old tool ID platform.core.cases.attachments', () => {
    const tool = buildTool(buildRegistry([]), true);
    expect(tool.id).toBe('platform.core.cases.attachments');
  });

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

// ---------------------------------------------------------------------------
// Tests: availability
// ---------------------------------------------------------------------------

describe('attachmentsTool availability', () => {
  const emptyRegistry = buildRegistry([]);

  it('returns unavailable for es solution', async () => {
    const coreSetup = makeCoreWithSolution('es');
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...attachmentsTool(jest.fn(), emptyRegistry, true), availability };
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as AvailabilityContext);
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });

  it('returns available for oblt solution', async () => {
    const coreSetup = makeCoreWithSolution('oblt');
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...attachmentsTool(jest.fn(), emptyRegistry, true), availability };
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as AvailabilityContext);
    expect(result).toEqual({ status: 'available' });
  });

  it('cacheMode is space', () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), {}, {}]);
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...attachmentsTool(jest.fn(), emptyRegistry, true), availability };
    expect(tool.availability?.cacheMode).toBe('space');
  });
});
