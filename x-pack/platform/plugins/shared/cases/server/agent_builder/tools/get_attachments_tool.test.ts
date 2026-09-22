/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AvailabilityContext } from '@kbn/agent-builder-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { createCasesClientMock } from '../../client/mocks';
import { getAttachmentsTool } from './get_attachments_tool';
import { makeCoreWithSolution } from '../utils/mock_core_with_solution';
import { createCasesToolAvailability } from '../utils/get_cases_tool_availability';

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

const buildTool = (getCasesClientFn = jest.fn()) => {
  return getAttachmentsTool(getCasesClientFn);
};

describe('getAttachmentsTool', () => {
  it('has the correct tool id', () => {
    expect(buildTool().id).toBe('platform.core.cases.get_attachments');
  });

  it('has read-only annotations', () => {
    expect(buildTool().annotations).toEqual({
      title: 'Get Case Attachments',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('schema requires only case_id', () => {
    const shape = buildTool().schema.shape;
    expect(shape).toHaveProperty('case_id');
    expect(Object.keys(shape)).toEqual(['case_id']);
  });

  it('calls getAll and returns the result', async () => {
    const casesClient = createCasesClientMock();
    const mockAttachments = [{ id: '1', type: 'user', comment: 'hello' }];
    casesClient.attachments.getAll.mockResolvedValue(mockAttachments as never);

    const tool = buildTool(jest.fn().mockResolvedValue(casesClient));
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
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...getAttachmentsTool(jest.fn()), availability };
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as AvailabilityContext);
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });

  it('returns available for classic solution', async () => {
    const coreSetup = makeCoreWithSolution('classic');
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...getAttachmentsTool(jest.fn()), availability };
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as AvailabilityContext);
    expect(result).toEqual({ status: 'available' });
  });

  it('cacheMode is space', () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), {}, {}]);
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...getAttachmentsTool(jest.fn()), availability };
    expect(tool.availability?.cacheMode).toBe('space');
  });
});
