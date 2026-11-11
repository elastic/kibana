/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useStreamsAppRouter } from './use_streams_app_router';
import { useStreamsPrivileges } from './use_streams_privileges';
import {
  CLASSIC_TAB_ORIGIN_KEY,
  rememberClassicTabOrigin,
  useNavigateToStreamsHome,
  useStreamsHomeLink,
} from './use_streams_home_link';

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
  params: { path: { unitId: 'edge', tab: 'classic' }, query },
});
const ROOT_LINK = JSON.stringify({ path: '/' });

const setup = ({ legacy = true, v2 = true }: { legacy?: boolean; v2?: boolean } = {}) => {
  jest
    .mocked(useStreamsAppRouter)
    .mockReturnValue({ link, push } as unknown as ReturnType<typeof useStreamsAppRouter>);
  jest.mocked(useStreamsPrivileges).mockReturnValue({
    access: { legacy, v2 },
  } as unknown as ReturnType<typeof useStreamsPrivileges>);
};

describe('rememberClassicTabOrigin', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('remembers the unit of the Classic tab and forgets it', () => {
    rememberClassicTabOrigin('edge');
    expect(sessionStorage.getItem(CLASSIC_TAB_ORIGIN_KEY)).toBe('edge');

    rememberClassicTabOrigin();
    expect(sessionStorage.getItem(CLASSIC_TAB_ORIGIN_KEY)).toBeNull();
  });
});

describe('useStreamsHomeLink', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('links to the Classic tab when the stream was opened from it', () => {
    setup();
    rememberClassicTabOrigin('edge');

    expect(renderHook(() => useStreamsHomeLink()).result.current).toBe(CLASSIC_TAB_LINK);
  });

  it('links to / for a stream opened anywhere else', () => {
    setup();

    expect(renderHook(() => useStreamsHomeLink()).result.current).toBe(ROOT_LINK);
  });

  it.each([
    ['V2', { v2: false }],
    ['Streams', { legacy: false }],
  ])('links to / without %s access', (_, access) => {
    setup(access);
    rememberClassicTabOrigin('edge');

    expect(renderHook(() => useStreamsHomeLink()).result.current).toBe(ROOT_LINK);
  });
});

describe('useNavigateToStreamsHome', () => {
  beforeEach(() => {
    push.mockClear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('goes to the Classic tab when the stream was opened from it', () => {
    setup();
    rememberClassicTabOrigin('edge');
    renderHook(() => useNavigateToStreamsHome()).result.current();

    expect(push).toHaveBeenCalledWith('/v2/unit/{unitId}/{tab}', {
      path: { unitId: 'edge', tab: 'classic' },
      query,
    });
  });

  it('goes to / for a stream opened anywhere else', () => {
    setup();
    renderHook(() => useNavigateToStreamsHome()).result.current();

    expect(push).toHaveBeenCalledWith('/', { path: {}, query });
  });
});
