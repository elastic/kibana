/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ToolAvailabilityContext, ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { createCasesClientMock } from '../../client/mocks';
import { getAttachmentsTool } from './get_attachments_tool';
import { makeCoreWithSolution } from '../utils/mock_core_with_solution';

const buildToolContext = (): ToolHandlerContext =>
  ({
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    logger: loggingSystemMock.createLogger(),
    attachments: {
      add: jest.fn().mockResolvedValue({ id: 'att-1' }),
      get: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
    },
  } as unknown as ToolHandlerContext);

describe('getAttachmentsTool', () => {
  it('has the correct tool id', () => {
    const casesClient = createCasesClientMock();
    const coreSetup = coreMock.createSetup();
    const tool = getAttachmentsTool(
      coreSetup,
      jest.fn().mockResolvedValue(casesClient),
      loggingSystemMock.createLogger()
    );
    expect(tool.id).toBe('platform.core.cases.get_attachments');
  });

  it('has read-only annotations', () => {
    const casesClient = createCasesClientMock();
    const coreSetup = coreMock.createSetup();
    const tool = getAttachmentsTool(
      coreSetup,
      jest.fn().mockResolvedValue(casesClient),
      loggingSystemMock.createLogger()
    );
    expect(tool.annotations).toEqual({
      title: 'Get Case Attachments',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('schema requires only case_id', () => {
    const casesClient = createCasesClientMock();
    const coreSetup = coreMock.createSetup();
    const tool = getAttachmentsTool(
      coreSetup,
      jest.fn().mockResolvedValue(casesClient),
      loggingSystemMock.createLogger()
    );
    const shape = tool.schema.shape;
    expect(shape).toHaveProperty('case_id');
    expect(Object.keys(shape)).toEqual(['case_id']);
  });

  it('calls getAll and returns the result', async () => {
    const casesClient = createCasesClientMock();
    const mockAttachments = [{ id: '1', type: 'user', comment: 'hello' }];
    casesClient.attachments.getAll.mockResolvedValue(mockAttachments as never);

    const coreSetup = coreMock.createSetup();
    const tool = getAttachmentsTool(
      coreSetup,
      jest.fn().mockResolvedValue(casesClient),
      loggingSystemMock.createLogger()
    );
    const result = await tool.handler({ case_id: 'case-1' } as never, buildToolContext());

    expect(casesClient.attachments.getAll).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: availability
// ---------------------------------------------------------------------------

describe('getAttachmentsTool availability', () => {
  it('returns unavailable for es solution', async () => {
    const coreSetup = makeCoreWithSolution('es');
    const tool = getAttachmentsTool(coreSetup, jest.fn(), loggingSystemMock.createLogger());
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as ToolAvailabilityContext);
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });

  it('returns available for classic solution', async () => {
    const coreSetup = makeCoreWithSolution('classic');
    const tool = getAttachmentsTool(coreSetup, jest.fn(), loggingSystemMock.createLogger());
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as ToolAvailabilityContext);
    expect(result).toEqual({ status: 'available' });
  });

  it('cacheMode is space', () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), {}, {}]);
    const tool = getAttachmentsTool(coreSetup, jest.fn(), loggingSystemMock.createLogger());
    expect(tool.availability?.cacheMode).toBe('space');
  });
});
