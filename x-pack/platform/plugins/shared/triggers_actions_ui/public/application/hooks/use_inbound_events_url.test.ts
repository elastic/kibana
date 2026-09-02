/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '../../common/lib/kibana';
import { useInboundEventsUrl } from './use_inbound_events_url';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const mockBasePath = ({
  get = '/',
  serverBasePath = '',
  publicBaseUrl,
}: {
  get?: string;
  serverBasePath?: string;
  publicBaseUrl?: string;
}) => {
  useKibanaMock.mockReturnValue({
    services: {
      http: {
        basePath: {
          get: () => get,
          serverBasePath,
          publicBaseUrl,
        },
      },
    },
  } as ReturnType<typeof useKibana>);
};

describe('useInboundEventsUrl', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('uses publicBaseUrl and omits the space prefix in the default space', () => {
    mockBasePath({
      get: '/',
      serverBasePath: '',
      publicBaseUrl: 'https://kibana.example.com',
    });

    const { result } = renderHook(() => useInboundEventsUrl('.inboundWebhook', 'sales-ingress'));

    expect(result.current).toEqual({
      url: 'https://kibana.example.com/api/actions/events/.inboundWebhook/sales-ingress',
      isPublicBaseUrlConfigured: true,
    });
  });

  it('inserts /s/{spaceId} when the current path is space-scoped', () => {
    mockBasePath({
      get: '/s/marketing',
      serverBasePath: '',
      publicBaseUrl: 'https://kibana.example.com/kb',
    });

    const { result } = renderHook(() => useInboundEventsUrl('.inboundWebhook', 'sales-ingress'));

    expect(result.current).toEqual({
      url: 'https://kibana.example.com/kb/s/marketing/api/actions/events/.inboundWebhook/sales-ingress',
      isPublicBaseUrlConfigured: true,
    });
  });

  it('returns a relative path when publicBaseUrl is not set', () => {
    mockBasePath({
      get: '/',
      serverBasePath: '',
    });

    const { result } = renderHook(() => useInboundEventsUrl('.inboundWebhook', 'sales-ingress'));

    expect(result.current).toEqual({
      url: '/api/actions/events/.inboundWebhook/sales-ingress',
      isPublicBaseUrlConfigured: false,
    });
  });

  it('includes the space prefix on the relative path', () => {
    mockBasePath({
      get: '/kb/s/marketing',
      serverBasePath: '/kb',
    });

    const { result } = renderHook(() => useInboundEventsUrl('.inboundWebhook', 'sales-ingress'));

    expect(result.current).toEqual({
      url: '/s/marketing/api/actions/events/.inboundWebhook/sales-ingress',
      isPublicBaseUrlConfigured: false,
    });
  });
});
