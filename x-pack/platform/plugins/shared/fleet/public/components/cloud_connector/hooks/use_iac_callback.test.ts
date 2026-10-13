/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import { useStartServices } from '../../../hooks';
import {
  sendCreateIacCallback,
  sendDeleteIacCallback,
  sendGetIacCallback,
} from '../../../hooks/use_request/iac_callback';
import type { IacCallback } from '../../../../common/types/models/iac_callback';

import {
  getIacCallbackKibanaUrl,
  IAC_CALLBACK_POLL_INTERVAL_MS,
  useIacCallback,
} from './use_iac_callback';

jest.mock('../../../hooks');
jest.mock('../../../hooks/use_request/iac_callback');

const mockedUseStartServices = jest.mocked(useStartServices);
const mockedCreate = jest.mocked(sendCreateIacCallback);
const mockedGet = jest.mocked(sendGetIacCallback);
const mockedDelete = jest.mocked(sendDeleteIacCallback);

const NOW = new Date('2026-10-13T10:00:00.000Z');
const EXPIRES_AT = '2026-10-13T12:00:00.000Z';

const pendingItem = (id = 'cb-1', overrides: Partial<IacCallback> = {}): IacCallback => ({
  id,
  provider: 'aws',
  status: 'pending',
  created_at: NOW.toISOString(),
  expires_at: EXPIRES_AT,
  ...overrides,
});

const RECEIVED_VALUES = {
  role_arn: 'arn:aws:iam::123456789012:role/ElasticWorkloadIdentity-abc',
  stack_arn: 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic/uuid-1',
  aws_account_id: '123456789012',
  region: 'us-east-1',
};

const setBasePath = (basePath: { publicBaseUrl?: string; serverBasePath: string }) =>
  mockedUseStartServices.mockReturnValue({ http: { basePath } } as any);

const poll = async () => {
  await act(async () => {
    jest.advanceTimersByTime(IAC_CALLBACK_POLL_INTERVAL_MS);
  });
};

describe('getIacCallbackKibanaUrl', () => {
  it('prefers the configured public base URL, without a trailing slash', () => {
    expect(
      getIacCallbackKibanaUrl({ publicBaseUrl: 'https://kb.example.com/', serverBasePath: '/abc' })
    ).toBe('https://kb.example.com');
  });

  it('falls back to the window origin plus the server base path (no space prefix)', () => {
    expect(getIacCallbackKibanaUrl({ serverBasePath: '/abc' }, 'https://kb.example.com')).toBe(
      'https://kb.example.com/abc'
    );
  });

  it('is undefined when the URL is not https (the stack would reject it)', () => {
    expect(getIacCallbackKibanaUrl({ serverBasePath: '' }, 'http://localhost:5601')).toBe(
      undefined
    );
  });
});

describe('useIacCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    setBasePath({ publicBaseUrl: 'https://kb.example.com', serverBasePath: '' });
    mockedCreate.mockResolvedValue({
      data: { item: pendingItem(), api_key: 'encoded-key' },
      error: null,
    } as any);
    mockedGet.mockResolvedValue({ data: { item: pendingItem() }, error: null } as any);
    mockedDelete.mockResolvedValue({
      data: { id: 'cb-1', status: 'cancelled' },
      error: null,
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('start() creates a record and returns the stack params', async () => {
    const { result } = renderHook(() => useIacCallback({ enabled: true }));

    let params: Record<string, string> | undefined;
    await act(async () => {
      params = await result.current.start();
    });

    expect(mockedCreate).toHaveBeenCalledWith({ provider: 'aws' });
    expect(params).toEqual({
      ElasticKibanaUrl: 'https://kb.example.com',
      ElasticApiKey: 'encoded-key',
      ElasticCallbackId: 'cb-1',
    });
    expect(result.current.status).toBe('pending');
  });

  it('polls while pending and exposes the values once received', async () => {
    const { result } = renderHook(() => useIacCallback({ enabled: true }));
    await act(async () => {
      await result.current.start();
    });

    await poll();
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith('cb-1');
    expect(result.current.status).toBe('pending');

    mockedGet.mockResolvedValue({
      data: { item: pendingItem('cb-1', { status: 'received', ...RECEIVED_VALUES }) },
      error: null,
    } as any);
    await poll();

    expect(result.current.status).toBe('received');
    expect(result.current.received).toEqual({
      roleArn: RECEIVED_VALUES.role_arn,
      stackArn: RECEIVED_VALUES.stack_arn,
      awsAccountId: RECEIVED_VALUES.aws_account_id,
      region: RECEIVED_VALUES.region,
    });

    // Polling stops once received.
    await poll();
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it('stops polling when the server reports the record cancelled', async () => {
    const { result } = renderHook(() => useIacCallback({ enabled: true }));
    await act(async () => {
      await result.current.start();
    });
    mockedGet.mockResolvedValue({
      data: { item: pendingItem('cb-1', { status: 'cancelled' }) },
      error: null,
    } as any);

    await poll();
    expect(result.current.status).toBe('cancelled');
    await poll();
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('stops polling as expired once expires_at has passed', async () => {
    const { result } = renderHook(() => useIacCallback({ enabled: true }));
    await act(async () => {
      await result.current.start();
    });

    jest.setSystemTime(new Date('2026-10-13T12:00:01.000Z'));
    await poll();

    expect(result.current.status).toBe('expired');
    // The deadline is checked before each request, so an expired record is never fetched.
    await poll();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('a second start() cancels the first record', async () => {
    mockedCreate
      .mockResolvedValueOnce({
        data: { item: pendingItem('cb-1'), api_key: 'k1' },
        error: null,
      } as any)
      .mockResolvedValueOnce({
        data: { item: pendingItem('cb-2'), api_key: 'k2' },
        error: null,
      } as any);
    const { result } = renderHook(() => useIacCallback({ enabled: true }));

    await act(async () => {
      await result.current.start();
    });
    let params: Record<string, string> | undefined;
    await act(async () => {
      params = await result.current.start();
    });

    expect(mockedDelete).toHaveBeenCalledWith('cb-1');
    expect(params?.ElasticCallbackId).toBe('cb-2');
    await poll();
    expect(mockedGet).toHaveBeenLastCalledWith('cb-2');
  });

  it('returns undefined and creates nothing when Kibana has no https URL', async () => {
    setBasePath({ serverBasePath: '' }); // falls back to jsdom's http://localhost
    const { result } = renderHook(() => useIacCallback({ enabled: true }));

    let params: Record<string, string> | undefined;
    await act(async () => {
      params = await result.current.start();
    });

    expect(params).toBeUndefined();
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('returns undefined when disabled', async () => {
    const { result } = renderHook(() => useIacCallback({ enabled: false }));
    let params: Record<string, string> | undefined;
    await act(async () => {
      params = await result.current.start();
    });
    expect(params).toBeUndefined();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('returns undefined and stays idle when the record cannot be created', async () => {
    mockedCreate.mockResolvedValue({ data: null, error: { message: 'boom' } } as any);
    const { result } = renderHook(() => useIacCallback({ enabled: true }));
    let params: Record<string, string> | undefined;
    await act(async () => {
      params = await result.current.start();
    });
    expect(params).toBeUndefined();
    expect(result.current.status).toBe('idle');
  });

  it('cancel() deletes the record and stops polling', async () => {
    const { result } = renderHook(() => useIacCallback({ enabled: true }));
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.cancel();
    });

    expect(mockedDelete).toHaveBeenCalledWith('cb-1');
    expect(result.current.status).toBe('idle');
    await poll();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('cancels a record whose creation finished after unmount and does not poll for it', async () => {
    let resolveCreate: (value: unknown) => void = () => {};
    mockedCreate.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)) as any);
    const { result, unmount } = renderHook(() => useIacCallback({ enabled: true }));

    let params: Record<string, string> | undefined;
    const started = act(async () => {
      params = await result.current.start();
    });
    // Let start() reach the create request, then take the form away while it is in flight.
    await act(async () => {});
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    unmount();
    resolveCreate({ data: { item: pendingItem('cb-late'), api_key: 'k' }, error: null });
    await started;

    expect(params).toBeUndefined();
    expect(mockedDelete).toHaveBeenCalledWith('cb-late');
    await poll();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('cancels the pending record on unmount', async () => {
    const { result, unmount } = renderHook(() => useIacCallback({ enabled: true }));
    await act(async () => {
      await result.current.start();
    });

    unmount();

    expect(mockedDelete).toHaveBeenCalledWith('cb-1');
  });
});
