/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ToolAvailabilityContext } from '@kbn/agent-builder-server/tools';
import { observablesTool } from './observable_tools';
import { makeCoreWithSolution } from '../utils/mock_core_with_solution';

describe('observablesTool availability', () => {
  it('returns unavailable for es solution', async () => {
    const coreSetup = makeCoreWithSolution('es');
    const tool = observablesTool(coreSetup, jest.fn(), loggingSystemMock.createLogger());
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as ToolAvailabilityContext);
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });

  it('returns available for security solution', async () => {
    const coreSetup = makeCoreWithSolution('security');
    const tool = observablesTool(coreSetup, jest.fn(), loggingSystemMock.createLogger());
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as ToolAvailabilityContext);
    expect(result).toEqual({ status: 'available' });
  });

  it('cacheMode is space', () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), {}, {}]);
    const tool = observablesTool(coreSetup, jest.fn(), loggingSystemMock.createLogger());
    expect(tool.availability?.cacheMode).toBe('space');
  });
});
