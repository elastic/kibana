/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AvailabilityContext } from '@kbn/agent-builder-server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { observablesTool } from './observable_tools';
import { makeCoreWithSolution } from '../utils/mock_core_with_solution';
import { createCasesToolAvailability } from '../utils/get_cases_tool_availability';
import { invokeStepHandler } from '../utils/invoke_step';

jest.mock('../utils/invoke_step', () => ({ invokeStepHandler: jest.fn() }));
const invokeStepHandlerMock = invokeStepHandler as jest.MockedFunction<typeof invokeStepHandler>;

const theCase = { id: 'case-1', title: 'Test Case', owner: 'securitySolution' };

const buildMockAttachments = () => ({
  add: jest.fn().mockResolvedValue({ id: 'att-1' }),
  get: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  list: jest.fn(),
});

const buildToolContext = (
  attachments: ReturnType<typeof buildMockAttachments>,
  callSource: ToolHandlerContext['callContext']['callSource']
): ToolHandlerContext =>
  ({
    request: httpServerMock.createKibanaRequest(),
    spaceId: 'default',
    logger: loggingSystemMock.createLogger(),
    attachments,
    callContext: { toolId: 'platform.core.cases.observables', toolCallId: 'call-1', callSource },
  } as unknown as ToolHandlerContext);

describe('observablesTool handler — attachment emission by caller', () => {
  beforeEach(() => {
    invokeStepHandlerMock.mockReset();
    invokeStepHandlerMock.mockResolvedValue({
      results: [{ type: 'other', data: { case: theCase } }],
    });
  });

  it('emits a case attachment for an Agent Builder conversation call', async () => {
    const attachments = buildMockAttachments();
    const tool = observablesTool(jest.fn());
    const result = await tool.handler(
      {
        mode: 'add',
        case_id: 'case-1',
        observables: [{ typeKey: 'observable-type-ipv4', value: '10.0.0.1' }],
      } as never,
      buildToolContext(attachments, 'agent')
    );

    expect(attachments.add).toHaveBeenCalledTimes(1);
    const { results } = result as unknown as { results: Array<{ data: Record<string, unknown> }> };
    expect(results[0].data.attachment_ids).toEqual(['att-1']);
  });

  it.each(['mcp', 'user', 'unknown'] as const)(
    'returns the case without emitting an attachment for %s callers',
    async (callSource) => {
      const attachments = buildMockAttachments();
      const tool = observablesTool(jest.fn());
      const result = await tool.handler(
        {
          mode: 'add',
          case_id: 'case-1',
          observables: [{ typeKey: 'observable-type-ipv4', value: '10.0.0.1' }],
        } as never,
        buildToolContext(attachments, callSource)
      );

      expect(invokeStepHandlerMock).toHaveBeenCalledTimes(1);
      expect(attachments.add).not.toHaveBeenCalled();
      const { results } = result as unknown as {
        results: Array<{ data: Record<string, unknown> }>;
      };
      expect(results[0].data.case).toEqual(theCase);
      expect(results[0].data.attachment_ids).toBeUndefined();
    }
  );
});

describe('observablesTool availability', () => {
  it('returns unavailable for es solution', async () => {
    const coreSetup = makeCoreWithSolution('es');
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...observablesTool(jest.fn()), availability };
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as AvailabilityContext);
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });

  it('returns available for security solution', async () => {
    const coreSetup = makeCoreWithSolution('security');
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...observablesTool(jest.fn()), availability };
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as AvailabilityContext);
    expect(result).toEqual({ status: 'available' });
  });

  it('cacheMode is space', () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), {}, {}]);
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...observablesTool(jest.fn()), availability };
    expect(tool.availability?.cacheMode).toBe('space');
  });
});
