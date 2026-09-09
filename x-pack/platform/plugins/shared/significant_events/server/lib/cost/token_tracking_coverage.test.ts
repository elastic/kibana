/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { SignificantEventsServer } from '../../types';
import { resolveTokenTrackingCoverage } from './token_tracking_coverage';

const request = { headers: {} } as KibanaRequest;
const logger = loggerMock.create();
const getAll = jest.fn();
const getSetting = jest.fn();
const getScopedClient = jest.fn().mockReturnValue({});
const asScopedToClient = jest.fn().mockImplementation(() => ({ get: getSetting }));

const createServer = ({ spacesAvailable = true }: { spacesAvailable?: boolean } = {}) =>
  ({
    spaces: spacesAvailable
      ? {
          spacesService: {
            createSpacesClient: jest.fn().mockReturnValue({ getAll }),
          },
        }
      : undefined,
    core: {
      savedObjects: { getScopedClient },
      uiSettings: { asScopedToClient },
    },
  } as unknown as SignificantEventsServer);

describe('resolveTokenTrackingCoverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getScopedClient.mockReturnValue({});
    asScopedToClient.mockImplementation(() => ({ get: getSetting }));
  });

  it('counts enabled settings across every space and deduplicates the default space', async () => {
    getAll.mockResolvedValue([{ id: 'default' }, { id: 'engineering' }, { id: 'security' }]);
    getSetting.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'partial',
      enabledSpaceCount: 2,
      totalSpaceCount: 3,
    });
    expect(getSetting).toHaveBeenCalledTimes(3);
  });

  it('reports full and empty coverage', async () => {
    getAll.mockResolvedValue([{ id: 'default' }, { id: 'engineering' }]);
    getSetting.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'full',
      enabledSpaceCount: 2,
      totalSpaceCount: 2,
    });

    getSetting.mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'none',
      enabledSpaceCount: 0,
      totalSpaceCount: 2,
    });
  });

  it('checks only the default space when Spaces is unavailable', async () => {
    getSetting.mockResolvedValue(true);
    await expect(
      resolveTokenTrackingCoverage({
        request,
        server: createServer({ spacesAvailable: false }),
        logger,
      })
    ).resolves.toEqual({
      status: 'full',
      enabledSpaceCount: 1,
      totalSpaceCount: 1,
    });
    expect(getSetting).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable coverage when spaces or settings cannot be read', async () => {
    getAll.mockResolvedValue([{ id: 'default' }]);
    getSetting.mockRejectedValue(new Error('settings failed'));
    await expect(
      resolveTokenTrackingCoverage({ request, server: createServer(), logger })
    ).resolves.toEqual({
      status: 'unavailable',
      enabledSpaceCount: null,
      totalSpaceCount: null,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Unable to determine token tracking coverage: settings failed'
    );
  });
});
