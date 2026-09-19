/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AvailabilityContext } from '@kbn/agent-builder-server';
import { manageCasesTool } from './manage_cases';
import { makeCoreWithSolution } from '../utils/mock_core_with_solution';
import { createCasesToolAvailability } from '../utils/get_cases_tool_availability';

describe('manageCasesTool availability', () => {
  it('returns unavailable for es solution', async () => {
    const coreSetup = makeCoreWithSolution('es');
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...manageCasesTool(jest.fn(), false), availability };
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as AvailabilityContext);
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });

  it('returns available for classic solution', async () => {
    const coreSetup = makeCoreWithSolution('classic');
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...manageCasesTool(jest.fn(), false), availability };
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as AvailabilityContext);
    expect(result).toEqual({ status: 'available' });
  });

  it('cacheMode is space', () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), {}, {}]);
    const availability = createCasesToolAvailability(coreSetup, loggingSystemMock.createLogger());
    const tool = { ...manageCasesTool(jest.fn(), false), availability };
    expect(tool.availability?.cacheMode).toBe('space');
  });
});
