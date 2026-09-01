/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { CasesServerStartDependencies } from '../../types';
import { getCasesToolAvailability } from './get_cases_tool_availability';
import { makeCoreWithSolution } from './mock_core_with_solution';

const request = httpServerMock.createKibanaRequest();
const logger = loggingSystemMock.createLogger();

describe('getCasesToolAvailability', () => {
  it('returns unavailable for es solution', async () => {
    const core = makeCoreWithSolution('es');
    const result = await getCasesToolAvailability({ core, logger, request });
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });

  it('returns available for classic solution', async () => {
    const core = makeCoreWithSolution('classic');
    const result = await getCasesToolAvailability({ core, logger, request });
    expect(result).toEqual({ status: 'available' });
  });

  it('returns available for oblt solution', async () => {
    const core = makeCoreWithSolution('oblt');
    const result = await getCasesToolAvailability({ core, logger, request });
    expect(result).toEqual({ status: 'available' });
  });

  it('returns available for security solution', async () => {
    const core = makeCoreWithSolution('security');
    const result = await getCasesToolAvailability({ core, logger, request });
    expect(result).toEqual({ status: 'available' });
  });

  it('returns available when solution is undefined (stateful, no space gating)', async () => {
    const core = makeCoreWithSolution(undefined);
    const result = await getCasesToolAvailability({ core, logger, request });
    expect(result).toEqual({ status: 'available' });
  });

  it('returns available when spaces service is absent', async () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([
      coreMock.createStart(),
      {}, // no spaces key
      {},
    ]);
    const result = await getCasesToolAvailability({
      core: coreSetup as unknown as CoreSetup<CasesServerStartDependencies>,
      logger,
      request,
    });
    expect(result).toEqual({ status: 'available' });
  });

  it('returns available when getActiveSpace throws', async () => {
    const coreSetup = coreMock.createSetup();
    const pluginsStart = {
      spaces: {
        spacesService: {
          getActiveSpace: jest.fn().mockRejectedValue(new Error('spaces unavailable')),
        },
      },
    };
    coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), pluginsStart, {}]);
    const result = await getCasesToolAvailability({
      core: coreSetup as unknown as CoreSetup<CasesServerStartDependencies>,
      logger,
      request,
    });
    expect(result).toEqual({ status: 'available' });
  });
});
