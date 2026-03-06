/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, CoreSetup } from '@kbn/core/server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createVisibilityAccessOverrideSwitcher } from './visibility_access_override_switcher';
import { hasAgentVisibilityAccessOverrideFromRequest } from '../services/utils';

const minimalCapabilities: Capabilities = {
  navLinks: {},
  management: {},
  catalogue: {},
};

jest.mock('../services/utils', () => ({
  hasAgentVisibilityAccessOverrideFromRequest: jest.fn(),
}));

const mockHasAgentVisibilityAccessOverrideFromRequest = jest.mocked(
  hasAgentVisibilityAccessOverrideFromRequest
);

describe('createVisibilityAccessOverrideSwitcher', () => {
  const logger = loggingSystemMock.createLogger();

  const createSwitcher = (getStartServices: CoreSetup['getStartServices']) =>
    createVisibilityAccessOverrideSwitcher(getStartServices, logger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty object when useDefaultCapabilities is true', async () => {
    const getStartServices = jest.fn().mockResolvedValue([coreMock.createStart(), {}, {}]);
    const switcher = createSwitcher(getStartServices);
    const request = httpServerMock.createKibanaRequest();

    const result = await switcher(request, minimalCapabilities, true);

    expect(result).toEqual({});
    expect(getStartServices).not.toHaveBeenCalled();
    expect(mockHasAgentVisibilityAccessOverrideFromRequest).not.toHaveBeenCalled();
  });

  it('returns agentBuilder.hasAgentVisibilityAccessOverride true when privilege check grants override', async () => {
    mockHasAgentVisibilityAccessOverrideFromRequest.mockResolvedValue(true);
    const asCurrentUser = {};
    const getStartServices = jest.fn().mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asScoped: jest.fn().mockReturnValue({ asCurrentUser }),
          },
        },
      },
      {},
      {},
    ] as unknown as Awaited<ReturnType<CoreSetup['getStartServices']>>);
    const switcher = createSwitcher(getStartServices);
    const request = httpServerMock.createKibanaRequest();

    const result = await switcher(request, minimalCapabilities, false);

    expect(result).toEqual({
      agentBuilder: {
        hasAgentVisibilityAccessOverride: true,
      },
    });
    expect(mockHasAgentVisibilityAccessOverrideFromRequest).toHaveBeenCalledTimes(1);
    expect(mockHasAgentVisibilityAccessOverrideFromRequest).toHaveBeenCalledWith({
      esClient: asCurrentUser,
    });
  });

  it('returns empty object when privilege check does not grant override', async () => {
    mockHasAgentVisibilityAccessOverrideFromRequest.mockResolvedValue(false);
    const asCurrentUser = {};
    const getStartServices = jest.fn().mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asScoped: jest.fn().mockReturnValue({ asCurrentUser }),
          },
        },
      },
      {},
      {},
    ] as unknown as Awaited<ReturnType<CoreSetup['getStartServices']>>);
    const switcher = createSwitcher(getStartServices);
    const request = httpServerMock.createKibanaRequest();

    const result = await switcher(request, minimalCapabilities, false);

    expect(result).toEqual({});
    expect(mockHasAgentVisibilityAccessOverrideFromRequest).toHaveBeenCalledTimes(1);
  });

  it('returns agentBuilder.hasAgentVisibilityAccessOverride false and logs when getStartServices rejects', async () => {
    const getStartServices = jest.fn().mockRejectedValue(new Error('Core not ready'));
    const switcher = createSwitcher(getStartServices);
    const request = httpServerMock.createKibanaRequest();

    const result = await switcher(request, minimalCapabilities, false);

    expect(result).toEqual({
      agentBuilder: {
        hasAgentVisibilityAccessOverride: false,
      },
    });
    expect(logger.debug).toHaveBeenCalledWith(
      'Visibility access override capability switcher failed',
      { error: expect.any(Error) }
    );
    expect(mockHasAgentVisibilityAccessOverrideFromRequest).not.toHaveBeenCalled();
  });

  it('returns agentBuilder.hasAgentVisibilityAccessOverride false and logs when privilege check throws', async () => {
    mockHasAgentVisibilityAccessOverrideFromRequest.mockRejectedValue(
      new Error('Elasticsearch unavailable')
    );
    const asCurrentUser = {};
    const getStartServices = jest.fn().mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asScoped: jest.fn().mockReturnValue({ asCurrentUser }),
          },
        },
      },
      {},
      {},
    ] as unknown as Awaited<ReturnType<CoreSetup['getStartServices']>>);
    const switcher = createSwitcher(getStartServices);
    const request = httpServerMock.createKibanaRequest();

    const result = await switcher(request, minimalCapabilities, false);

    expect(result).toEqual({
      agentBuilder: {
        hasAgentVisibilityAccessOverride: false,
      },
    });
    expect(logger.debug).toHaveBeenCalledWith(
      'Visibility access override capability switcher failed',
      { error: expect.any(Error) }
    );
  });
});
