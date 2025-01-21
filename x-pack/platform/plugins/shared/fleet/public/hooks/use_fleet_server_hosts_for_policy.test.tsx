/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useFleetServerHostsForPolicy } from './use_fleet_server_hosts_for_policy';
import { useGetEnrollmentSettings } from './use_request/settings';

jest.mock('./use_request/settings');

describe('useFleetServerHostsForPolicy', () => {
  beforeEach(() => {
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
          es_output: {
            id: 'es-output',
            name: 'es-output',
            is_default: false,
            is_default_monitoring: false,
            type: 'elasticsearch',
            hosts: ['https://elasticsearch:9200'],
          },
          es_output_proxy: {
            id: 'es-output-proxy',
            name: 'es-output-proxy',
            url: 'https://es-output-proxy',
            proxy_headers: {
              'header-key': 'header-value',
            },
            is_preconfigured: false,
          },
        },
        download_source: {
          id: 'default-source',
          name: 'default-source',
          host: 'https://defaultsource',
          is_default: false,
        },
        download_source_proxy: {
          id: 'download-src-proxy',
          name: 'download-src-proxy',
          url: 'https://download-src-proxy',
          proxy_headers: {
            'header-key': 'header-value',
          },
          is_preconfigured: false,
        },
      },
    });
  });

  it('should return correct state from api request', () => {
    const { result } = renderHook(() => useFleetServerHostsForPolicy());
    expect(result.current).toEqual({
      isLoadingInitialRequest: false,
      fleetServerHost: 'https://defaultfleetserver:8220',
      fleetProxy: {
        id: 'default-proxy',
        name: 'default-proxy',
        url: 'https://defaultproxy',
        is_preconfigured: false,
      },
      esOutput: {
        id: 'es-output',
        name: 'es-output',
        is_default: false,
        is_default_monitoring: false,
        type: 'elasticsearch',
        hosts: ['https://elasticsearch:9200'],
      },
      esOutputProxy: {
        id: 'es-output-proxy',
        name: 'es-output-proxy',
        url: 'https://es-output-proxy',
        proxy_headers: {
          'header-key': 'header-value',
        },
        is_preconfigured: false,
      },
      downloadSource: {
        id: 'default-source',
        name: 'default-source',
        host: 'https://defaultsource',
        is_default: false,
      },
      downloadSourceProxy: {
        id: 'download-src-proxy',
        name: 'download-src-proxy',
        url: 'https://download-src-proxy',
        proxy_headers: {
          'header-key': 'header-value',
        },
        is_preconfigured: false,
      },
    });
  });
});
