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
  const originalOrigin = window.location.origin;

  afterEach(() => {
    jest.resetAllMocks();
    Object.defineProperty(window, 'location', {
      value: { origin: originalOrigin },
      writable: true,
    });
  });

  it('uses publicBaseUrl and omits the space prefix in the default space', () => {
    mockBasePath({
      get: '/',
      serverBasePath: '',
      publicBaseUrl: 'https://kibana.example.com',
    });

    const { result } = renderHook(() => useInboundEventsUrl('.inboundWebhook', 'sales-ingress'));

    expect(result.current).toBe(
      'https://kibana.example.com/api/actions/events/.inboundWebhook/sales-ingress'
    );
  });

  it('inserts /s/{spaceId} when the current path is space-scoped', () => {
    mockBasePath({
      get: '/s/marketing',
      serverBasePath: '',
      publicBaseUrl: 'https://kibana.example.com/kb',
    });

    const { result } = renderHook(() => useInboundEventsUrl('.inboundWebhook', 'sales-ingress'));

    expect(result.current).toBe(
      'https://kibana.example.com/kb/s/marketing/api/actions/events/.inboundWebhook/sales-ingress'
    );
  });

  it('falls back to window.location.origin when publicBaseUrl is missing', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5601' },
      writable: true,
    });
    mockBasePath({
      get: '/',
      serverBasePath: '',
    });

    const { result } = renderHook(() => useInboundEventsUrl('.inboundWebhook', 'sales-ingress'));

    expect(result.current).toBe(
      'http://localhost:5601/api/actions/events/.inboundWebhook/sales-ingress'
    );
  });

  it('includes serverBasePath on the origin fallback', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5601' },
      writable: true,
    });
    mockBasePath({
      get: '/kb',
      serverBasePath: '/kb',
    });

    const { result } = renderHook(() => useInboundEventsUrl('.inboundWebhook', 'sales-ingress'));

    expect(result.current).toBe(
      'http://localhost:5601/kb/api/actions/events/.inboundWebhook/sales-ingress'
    );
  });
});
