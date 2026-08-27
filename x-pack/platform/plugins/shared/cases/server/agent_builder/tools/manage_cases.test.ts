/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { manageCasesTool } from './manage_cases';

const makeCore = (solution: string | undefined) => {
  const coreSetup = coreMock.createSetup();
  const pluginsStart = {
    spaces: {
      spacesService: {
        getActiveSpace: jest.fn().mockResolvedValue({ solution }),
      },
    },
  };
  coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), pluginsStart, {}]);
  return coreSetup;
};

describe('manageCasesTool availability', () => {
  it('returns unavailable for es solution', async () => {
    const coreSetup = makeCore('es');
    const tool = manageCasesTool(coreSetup, jest.fn(), false, loggingSystemMock.createLogger());
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as any);
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });

  it('returns available for classic solution', async () => {
    const coreSetup = makeCore('classic');
    const tool = manageCasesTool(coreSetup, jest.fn(), false, loggingSystemMock.createLogger());
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as any);
    expect(result).toEqual({ status: 'available' });
  });

  it('cacheMode is space', () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), {}, {}]);
    const tool = manageCasesTool(coreSetup, jest.fn(), false, loggingSystemMock.createLogger());
    expect(tool.availability?.cacheMode).toBe('space');
  });
});
