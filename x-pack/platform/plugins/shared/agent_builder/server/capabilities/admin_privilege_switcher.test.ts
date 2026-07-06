/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, CoreSetup, CoreStart } from '@kbn/core/server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createAdminPrivilegeSwitcher } from './admin_privilege_switcher';
import { isAdminFromRequest } from '../services/utils';

function createStartServicesWithScopedEsClient(
  asCurrentUser: object
): Awaited<ReturnType<CoreSetup['getStartServices']>> {
  const coreStart: CoreStart = coreMock.createStart();
  const asScoped = jest.fn().mockReturnValue({ asCurrentUser });
  Object.assign(coreStart.elasticsearch.client, { asScoped });
  return [coreStart, {}, {}];
}

const minimalCapabilities: Capabilities = {
  navLinks: {},
  management: {},
  catalogue: {},
};

jest.mock('../services/utils', () => ({
  isAdminFromRequest: jest.fn(),
}));

const mockIsAdminFromRequest = jest.mocked(isAdminFromRequest);

describe('createAdminPrivilegeSwitcher', () => {
  const logger = loggingSystemMock.createLogger();

  const createSwitcher = (getStartServices: CoreSetup['getStartServices']) =>
    createAdminPrivilegeSwitcher(getStartServices, logger);

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
    expect(mockIsAdminFromRequest).not.toHaveBeenCalled();
  });

  it('returns agentBuilder.isAdmin true when privilege check grants admin', async () => {
    mockIsAdminFromRequest.mockResolvedValue(true);
    const asCurrentUser = {};
    const getStartServices = jest
      .fn()
      .mockResolvedValue(createStartServicesWithScopedEsClient(asCurrentUser));
    const switcher = createSwitcher(getStartServices);
    const request = httpServerMock.createKibanaRequest();

    const result = await switcher(request, minimalCapabilities, false);

    expect(result).toEqual({
      agentBuilder: {
        isAdmin: true,
      },
    });
    expect(mockIsAdminFromRequest).toHaveBeenCalledTimes(1);
    expect(mockIsAdminFromRequest).toHaveBeenCalledWith({
      esClient: asCurrentUser,
    });
  });

  it('returns empty object when privilege check does not grant admin', async () => {
    mockIsAdminFromRequest.mockResolvedValue(false);
    const asCurrentUser = {};
    const getStartServices = jest
      .fn()
      .mockResolvedValue(createStartServicesWithScopedEsClient(asCurrentUser));
    const switcher = createSwitcher(getStartServices);
    const request = httpServerMock.createKibanaRequest();

    const result = await switcher(request, minimalCapabilities, false);

    expect(result).toEqual({});
    expect(mockIsAdminFromRequest).toHaveBeenCalledTimes(1);
  });

  it('returns agentBuilder.isAdmin false and logs when getStartServices rejects', async () => {
    const getStartServices = jest.fn().mockRejectedValue(new Error('Core not ready'));
    const switcher = createSwitcher(getStartServices);
    const request = httpServerMock.createKibanaRequest();

    const result = await switcher(request, minimalCapabilities, false);

    expect(result).toEqual({
      agentBuilder: {
        isAdmin: false,
      },
    });
    expect(logger.debug).toHaveBeenCalledWith('Admin privilege capability switcher failed', {
      error: expect.any(Error),
    });
    expect(mockIsAdminFromRequest).not.toHaveBeenCalled();
  });

  it('returns agentBuilder.isAdmin false and logs when privilege check throws', async () => {
    mockIsAdminFromRequest.mockRejectedValue(new Error('Elasticsearch unavailable'));
    const asCurrentUser = {};
    const getStartServices = jest
      .fn()
      .mockResolvedValue(createStartServicesWithScopedEsClient(asCurrentUser));
    const switcher = createSwitcher(getStartServices);
    const request = httpServerMock.createKibanaRequest();

    const result = await switcher(request, minimalCapabilities, false);

    expect(result).toEqual({
      agentBuilder: {
        isAdmin: false,
      },
    });
    expect(logger.debug).toHaveBeenCalledWith('Admin privilege capability switcher failed', {
      error: expect.any(Error),
    });
  });
});
