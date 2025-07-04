/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetEnrollmentSettings } from '../../../hooks';
import { createFleetTestRendererMock } from '../../../../../mock';

import { useSelectFleetServerPolicy } from './use_select_fleet_server_policy';

jest.mock('../../../hooks');
jest.mocked(useGetEnrollmentSettings).mockReturnValue({
  isLoading: false,
  isInitialRequest: false,
  error: null,
  resendRequest: jest.fn(),
  data: {
    fleet_server: {
      policies: [
        {
          id: 'default-policy',
          name: 'default-policy',
          is_managed: false,
        },
        {
          id: 'managed-policy',
          name: 'managed-policy',
          is_managed: true,
        },
      ],
      host: {
        id: 'fleet-server',
        name: 'fleet-server',
        is_preconfigured: false,
        is_default: true,
        host_urls: ['https://defaultfleetserver:8220'],
      },
      host_proxy: {
        id: 'default-proxy',
        name: 'default-proxy',
        url: 'https://defaultproxy',
        is_preconfigured: false,
      },
      has_active: true,
    },
    download_source: {
      id: 'default-source',
      name: 'default-source',
      host: 'https://defaultsource',
      is_default: false,
    },
  },
});

describe('useSelectFleetServerPolicy hook', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('Return eligible fleet server policies', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useSelectFleetServerPolicy());
    expect(result.current.fleetServerPolicyId).toEqual('default-policy');
    expect(result.current.eligibleFleetServerPolicies.map(({ id }) => id)).toEqual([
      'default-policy',
    ]);
  });
});
