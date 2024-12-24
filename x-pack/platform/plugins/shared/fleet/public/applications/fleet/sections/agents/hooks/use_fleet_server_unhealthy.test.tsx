/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFleetTestRendererMock } from '../../../../../mock';
import { sendGetEnrollmentSettings } from '../../../../../hooks/use_request/settings';

import { useFleetServerUnhealthy } from './use_fleet_server_unhealthy';

jest.mock('../../../../../hooks/use_request/settings');
jest.mock('../../../../../hooks/use_authz', () => ({
  useAuthz: jest.fn().mockReturnValue({
    fleet: {
      addAgents: true,
    },
  }),
}));

describe('useFleetServerUnhealthy', () => {
  const testRenderer = createFleetTestRendererMock();

  it('should return isUnHealthy:false with an online fleet server', async () => {
    jest.mocked(sendGetEnrollmentSettings).mockResolvedValueOnce({
      error: null,
      data: {
        fleet_server: {
          has_active: true,
          policies: [
            {
              id: 'default-policy',
              name: 'default-policy',
              is_managed: false,
            },
          ],
          host: {
            id: 'fleet-server',
            name: 'fleet-server',
            is_preconfigured: false,
            is_default: true,
            host_urls: ['https://defaultfleetserver:8220'],
          },
        },
      },
    });

    const { result } = testRenderer.renderHook(() => useFleetServerUnhealthy());
    await testRenderer.waitFor(() => expect(result.current.isLoading).toBeFalsy());
    expect(result.current.isUnhealthy).toBeFalsy();
  });

  it('should return isUnHealthy:true with only one offline fleet server', async () => {
    jest.mocked(sendGetEnrollmentSettings).mockResolvedValue({
      error: null,
      data: {
        fleet_server: {
          has_active: false,
          policies: [],
        },
      },
    });
    const { result } = testRenderer.renderHook(() => useFleetServerUnhealthy());
    await testRenderer.waitFor(() => expect(result.current.isLoading).toBeFalsy());
    expect(result.current.isUnhealthy).toBeTruthy();
  });

  it('should call notifications service if an error happen while fetching status', async () => {
    jest.mocked(sendGetEnrollmentSettings).mockResolvedValueOnce({
      error: new Error('Invalid request'),
      data: null,
    });
    const { result } = testRenderer.renderHook(() => useFleetServerUnhealthy());
    await testRenderer.waitFor(() => expect(result.current.isLoading).toBeFalsy());
    expect(result.current.isUnhealthy).toBeFalsy();
    expect(testRenderer.startServices.notifications.toasts.addError).toBeCalled();
  });
});
