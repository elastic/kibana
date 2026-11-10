/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useStreamsAppParams } from './use_streams_app_params';
import { useStreamsAppRouter } from './use_streams_app_router';
import { useStreamsPrivileges } from './use_streams_privileges';
import {
  useNavigateToStreamsHome,
  useStreamOrigin,
  useStreamsHomeLink,
} from './use_streams_home_link';

jest.mock('./use_streams_app_params', () => ({ useStreamsAppParams: jest.fn() }));
jest.mock('./use_streams_app_router', () => ({ useStreamsAppRouter: jest.fn() }));
jest.mock('./use_streams_privileges', () => ({ useStreamsPrivileges: jest.fn() }));
jest.mock('./use_time_range', () => ({
  useTimeRange: () => ({ rangeFrom: 'now-15m', rangeTo: 'now' }),
}));

const link = jest.fn((path: string, params?: unknown) => JSON.stringify({ path, params }));
const push = jest.fn();

const query = { rangeFrom: 'now-15m', rangeTo: 'now' };
const CLASSIC_TAB_LINK = JSON.stringify({
  path: '/v2/unit/{unitId}/{tab}',
  params: { path: { unitId: 'default', tab: 'classic' }, query },
});
const ROOT_LINK = JSON.stringify({ path: '/' });

const setup = ({
  origin,
  legacy = true,
  v2 = true,
  onStreamPage = true,
}: {
  origin?: string;
  legacy?: boolean;
  v2?: boolean;
  onStreamPage?: boolean;
}) => {
  jest
    .mocked(useStreamsAppParams)
    .mockReturnValue(
      (onStreamPage ? { path: { key: 'logs.otel' }, query: { origin } } : undefined) as ReturnType<
        typeof useStreamsAppParams
      >
    );
  jest
    .mocked(useStreamsAppRouter)
    .mockReturnValue({ link, push } as unknown as ReturnType<typeof useStreamsAppRouter>);
  jest.mocked(useStreamsPrivileges).mockReturnValue({
    access: { legacy, v2 },
  } as unknown as ReturnType<typeof useStreamsPrivileges>);
};

describe('useStreamOrigin', () => {
  it('reads the origin of the open stream page', () => {
    setup({ origin: 'v2' });

    expect(renderHook(() => useStreamOrigin()).result.current).toBe('v2');
  });

  it('is undefined outside a stream page', () => {
    setup({ onStreamPage: false });

    expect(renderHook(() => useStreamOrigin()).result.current).toBeUndefined();
  });
});

describe('useStreamsHomeLink', () => {
  it('links to the Classic tab when the stream was opened from it', () => {
    setup({ origin: 'v2' });

    expect(renderHook(() => useStreamsHomeLink()).result.current).toBe(CLASSIC_TAB_LINK);
  });

  it('links to / for a stream opened anywhere else', () => {
    setup({});

    expect(renderHook(() => useStreamsHomeLink()).result.current).toBe(ROOT_LINK);
  });

  it.each([
    ['V2', { v2: false }],
    ['Streams', { legacy: false }],
  ])('links to / without %s access', (_, access) => {
    setup({ origin: 'v2', ...access });

    expect(renderHook(() => useStreamsHomeLink()).result.current).toBe(ROOT_LINK);
  });
});

describe('useNavigateToStreamsHome', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('goes to the Classic tab when the stream was opened from it', () => {
    setup({ origin: 'v2' });
    renderHook(() => useNavigateToStreamsHome()).result.current();

    expect(push).toHaveBeenCalledWith('/v2/unit/{unitId}/{tab}', {
      path: { unitId: 'default', tab: 'classic' },
      query,
    });
  });

  it('goes to / for a stream opened anywhere else', () => {
    setup({});
    renderHook(() => useNavigateToStreamsHome()).result.current();

    expect(push).toHaveBeenCalledWith('/', { path: {}, query });
  });
});
