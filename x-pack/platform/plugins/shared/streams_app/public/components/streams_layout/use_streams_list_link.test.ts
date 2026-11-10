/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { rememberClassicTabOrigin, useStreamsListLink } from './use_streams_list_link';

jest.mock('../../hooks/use_streams_app_router', () => ({ useStreamsAppRouter: jest.fn() }));
jest.mock('../../hooks/use_streams_privileges', () => ({ useStreamsPrivileges: jest.fn() }));

const link = jest.fn((path: string, params?: unknown) => JSON.stringify({ path, params }));

const CLASSIC_TAB_LINK = JSON.stringify({
  path: '/v2/unit/{unitId}/{tab}',
  params: { path: { unitId: 'default', tab: 'classic' } },
});
const ROOT_LINK = JSON.stringify({ path: '/' });

const renderLink = ({ legacy = true, v2 = true }: { legacy?: boolean; v2?: boolean } = {}) => {
  jest
    .mocked(useStreamsAppRouter)
    .mockReturnValue({ link } as unknown as ReturnType<typeof useStreamsAppRouter>);
  jest.mocked(useStreamsPrivileges).mockReturnValue({
    access: { legacy, v2 },
  } as unknown as ReturnType<typeof useStreamsPrivileges>);
  return renderHook(() => useStreamsListLink()).result.current;
};

describe('useStreamsListLink', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('links back to the Classic tab when the stream was opened from it', () => {
    rememberClassicTabOrigin(true);

    expect(renderLink()).toBe(CLASSIC_TAB_LINK);
  });

  it('links to / when the stream was opened from anywhere else', () => {
    expect(renderLink()).toBe(ROOT_LINK);
  });

  it('links to / once another tab replaced the Classic tab', () => {
    rememberClassicTabOrigin(true);
    rememberClassicTabOrigin(false);

    expect(renderLink()).toBe(ROOT_LINK);
  });

  it('links to / for a user without V2 access', () => {
    rememberClassicTabOrigin(true);

    expect(renderLink({ v2: false })).toBe(ROOT_LINK);
  });
});
