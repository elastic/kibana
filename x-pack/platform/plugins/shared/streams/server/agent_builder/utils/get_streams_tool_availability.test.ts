/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { StreamsPluginStartDependencies } from '../../types';
import { getStreamsToolAvailability } from './get_streams_tool_availability';

const request = httpServerMock.createKibanaRequest();
const logger = loggingSystemMock.createLogger();

const makeCoreWithSolution = (
  solution: string | undefined
): CoreSetup<StreamsPluginStartDependencies> => {
  const coreSetup = coreMock.createSetup();
  const pluginsStart = {
    spaces: {
      spacesService: {
        getActiveSpace: jest.fn().mockResolvedValue({ solution }),
      },
    },
  };
  coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), pluginsStart, {}]);
  return coreSetup as unknown as CoreSetup<StreamsPluginStartDependencies>;
};

describe('getStreamsToolAvailability', () => {
  it('returns unavailable for es solution', async () => {
    const core = makeCoreWithSolution('es');
    const result = await getStreamsToolAvailability({ core, logger, request });
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });

  it('returns unavailable for vectordb solution', async () => {
    const core = makeCoreWithSolution('vectordb');
    const result = await getStreamsToolAvailability({ core, logger, request });
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });

  it('returns available for classic solution', async () => {
    const core = makeCoreWithSolution('classic');
    const result = await getStreamsToolAvailability({ core, logger, request });
    expect(result).toEqual({ status: 'available' });
  });

  it('returns available for oblt solution', async () => {
    const core = makeCoreWithSolution('oblt');
    const result = await getStreamsToolAvailability({ core, logger, request });
    expect(result).toEqual({ status: 'available' });
  });

  it('returns available for security solution', async () => {
    const core = makeCoreWithSolution('security');
    const result = await getStreamsToolAvailability({ core, logger, request });
    expect(result).toEqual({ status: 'available' });
  });

  it('returns available when solution is undefined (stateful, no space gating)', async () => {
    const core = makeCoreWithSolution(undefined);
    const result = await getStreamsToolAvailability({ core, logger, request });
    expect(result).toEqual({ status: 'available' });
  });

  it('returns available when spaces service is absent', async () => {
    const coreSetup = coreMock.createSetup();
    coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), {}, {}]);
    const result = await getStreamsToolAvailability({
      core: coreSetup as unknown as CoreSetup<StreamsPluginStartDependencies>,
      logger,
      request,
    });
    expect(result).toEqual({ status: 'available' });
  });

  it('returns unavailable when getActiveSpace throws', async () => {
    const coreSetup = coreMock.createSetup();
    const pluginsStart = {
      spaces: {
        spacesService: {
          getActiveSpace: jest.fn().mockRejectedValue(new Error('spaces unavailable')),
        },
      },
    };
    coreSetup.getStartServices.mockResolvedValue([coreMock.createStart(), pluginsStart, {}]);
    const result = await getStreamsToolAvailability({
      core: coreSetup as unknown as CoreSetup<StreamsPluginStartDependencies>,
      logger,
      request,
    });
    expect(result).toEqual({ status: 'unavailable', reason: expect.any(String) });
  });
});
