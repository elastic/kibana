/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { observablesTool } from './observable_tools';

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

describe('observablesTool availability', () => {
  it('returns unavailable for es solution', async () => {
    const coreSetup = makeCore('es');
    const tool = observablesTool(coreSetup, jest.fn(), loggingSystemMock.createLogger());
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as any);
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });

  it('returns available for security solution', async () => {
    const coreSetup = makeCore('security');
    const tool = observablesTool(coreSetup, jest.fn(), loggingSystemMock.createLogger());
    const request = httpServerMock.createKibanaRequest();
    const result = await tool.availability!.handler({ request } as any);
    expect(result).toEqual({ status: 'available' });
  });

  it('cacheMode is space', () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), {}, {}]);
    const tool = observablesTool(coreSetup, jest.fn(), loggingSystemMock.createLogger());
    expect(tool.availability?.cacheMode).toBe('space');
  });
});
