/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreStart } from '@kbn/core/public';

import { useFooterLinks } from './use_footer_links';

jest.mock('@kbn/cloud/connection_details', () => ({
  openWiredConnectionDetails: jest.fn(),
}));

const createApplication = (
  overrides: {
    navLinks?: Record<string, boolean>;
    users?: { save: boolean };
  } = {}
): CoreStart['application'] =>
  ({
    capabilities: {
      navLinks: { home: true, management: true, ...overrides.navLinks },
      catalogue: {},
      management: {},
      spaces: { manage: true },
      users: { save: true, ...overrides.users },
    },
    getUrlForApp: jest.fn((appId: string, opts?: { path?: string }) =>
      opts?.path ? `/app/${appId}/${opts.path}` : `/app/${appId}`
    ),
  } as unknown as CoreStart['application']);

const createCloud = (
  overrides: Partial<Pick<CloudStart, 'isCloudEnabled' | 'serverless' | 'getPrivilegedUrls'>> = {}
): CloudStart =>
  ({
    isCloudEnabled: true,
    serverless: { projectType: 'security' } as CloudStart['serverless'],
    getPrivilegedUrls: jest.fn().mockResolvedValue({ usersAndRolesUrl: undefined }),
    ...overrides,
  } as unknown as CloudStart);

describe('useFooterLinks', () => {
  const cloud = createCloud();

  it('returns "Add data" link for observability space solution', () => {
    const application = createApplication({
      navLinks: { home: true, observabilityOnboarding: true },
    });

    const { result } = renderHook(() =>
      useFooterLinks({ application, cloud, activeSpaceSolution: 'oblt' })
    );

    expect(result.current).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'addData', label: 'Add data' })])
    );
  });

  it('returns "Connection details" link for serverless cloud', () => {
    const application = createApplication();

    const { result } = renderHook(() => useFooterLinks({ application, cloud, isServerless: true }));

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'connectionDetails',
          label: 'Connection details',
        }),
      ])
    );
  });

  it('does not return "Connection details" when not serverless', () => {
    const application = createApplication();

    const { result } = renderHook(() =>
      useFooterLinks({ application, cloud, isServerless: false, activeSpaceSolution: 'es' })
    );

    const ids = result.current.map((item) => item.id);
    expect(ids).not.toContain('connectionDetails');
  });

  it('returns "Invite users" via Cloud for serverless when privileged URL is available', async () => {
    const application = createApplication();
    const cloudMock = createCloud({
      getPrivilegedUrls: jest
        .fn()
        .mockResolvedValue({ usersAndRolesUrl: 'https://cloud.elastic.co/users' }),
    });

    const { result } = renderHook(() =>
      useFooterLinks({ application, cloud: cloudMock, isServerless: true })
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'inviteUsers',
            label: 'Invite users',
            href: 'https://cloud.elastic.co/users',
            external: true,
          }),
        ])
      );
    });
  });

  it('returns "Invite users" via Kibana management for non-serverless', () => {
    const application = createApplication();

    const { result } = renderHook(() =>
      useFooterLinks({ application, cloud, activeSpaceSolution: 'security' })
    );

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'inviteUsers',
          label: 'Invite users',
          href: '/app/management/security/users',
          external: false,
        }),
      ])
    );
  });

  it('does not return "Invite users" when user lacks save permissions', () => {
    const application = createApplication({ users: { save: false }, navLinks: { home: true } });

    const { result } = renderHook(() =>
      useFooterLinks({ application, cloud, activeSpaceSolution: 'security' })
    );

    const ids = result.current.map((item) => item.id);
    expect(ids).not.toContain('inviteUsers');
  });
});
