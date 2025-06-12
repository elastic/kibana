/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useGetPackagesQuery } from '../../../../../../../hooks/use_request/epm';

import { useInstalledIntegrations } from './use_installed_integrations';

jest.mock('../../../../../../../hooks/use_request/epm');

describe('useInstalledIntegrations', () => {
  beforeEach(() => {
    jest.mocked(useGetPackagesQuery).mockReturnValue({
      data: {
        items: [
          {
            id: 'aws',
            name: 'aws',
            status: 'installed',
            version: '1.0.0',
            installationInfo: { version: '1.0.0' },
          },
          {
            id: 'azure',
            name: 'azure',
            status: 'installed',
            version: '1.0.0',
            installationInfo: {
              version: '1.0.0',
              latest_install_failed_attempts: [
                {
                  target_version: '1.2.0',
                },
              ],
            },
          },
          {
            id: 'nginx',
            name: 'nginx',
            status: 'install_failed',
            version: '1.0.0',
            installationInfo: { version: '1.0.0' },
          },
          {
            id: 'apache',
            name: 'apache',
            status: 'install_failed',
            version: '1.0.0',
            installationInfo: { version: '1.0.0' },
          },
          {
            id: 'mysql',
            name: 'mysql',
            status: 'installed',
            version: '2.0.0',
            installationInfo: { version: '1.0.0' },
          },
        ],
      },
    } as any);
  });

  it('should filter not installed packages and compute status in ui property', () => {
    const { result } = renderHook(() =>
      useInstalledIntegrations({}, { currentPage: 1, pageSize: 10 })
    );

    expect(result.current).toEqual({
      total: 5,
      countPerStatus: {
        install_failed: 2,
        installed: 1,
        upgrade_failed: 1,
        upgrade_available: 1,
      },
      customIntegrationsCount: 0,
      installedPackages: [
        expect.objectContaining({ id: 'aws', ui: { installation_status: 'installed' } }),
        expect.objectContaining({ id: 'azure', ui: { installation_status: 'upgrade_failed' } }),
        expect.objectContaining({ id: 'nginx', ui: { installation_status: 'install_failed' } }),
        expect.objectContaining({ id: 'apache', ui: { installation_status: 'install_failed' } }),
        expect.objectContaining({
          id: 'mysql',
          ui: { installation_status: 'upgrade_available' },
        }),
      ],
    });
  });

  it('should compute upgrading status in ui property', () => {
    const { result } = renderHook(() =>
      useInstalledIntegrations({}, { currentPage: 1, pageSize: 10 }, [
        {
          id: 'mysql',
          name: 'mysql',
          status: 'installed',
          version: '2.0.0',
          installationInfo: { version: '1.0.0' },
        },
      ] as any)
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        installedPackages: expect.arrayContaining([
          expect.objectContaining({
            id: 'mysql',
            ui: { installation_status: 'upgrading' },
          }),
        ]),
      })
    );
  });

  it('should support filtering on status', () => {
    const { result } = renderHook(() =>
      useInstalledIntegrations(
        {
          installationStatus: ['install_failed'],
        },
        { currentPage: 1, pageSize: 10 }
      )
    );

    expect(result.current).toEqual({
      total: 2,
      countPerStatus: {
        install_failed: 2,
      },
      customIntegrationsCount: 0,
      installedPackages: [
        expect.objectContaining({ id: 'nginx', ui: { installation_status: 'install_failed' } }),
        expect.objectContaining({ id: 'apache', ui: { installation_status: 'install_failed' } }),
      ],
    });
  });

  it('should support searching', () => {
    const { result } = renderHook(() =>
      useInstalledIntegrations(
        {
          q: 'a',
        },
        { currentPage: 1, pageSize: 10 }
      )
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        total: 3,
        installedPackages: [
          expect.objectContaining({ id: 'aws' }),
          expect.objectContaining({ id: 'azure' }),
          expect.objectContaining({ id: 'apache' }),
        ],
      })
    );
  });

  it('should support pagination', () => {
    const filters = {};
    const { result, rerender } = renderHook(
      ({ currentPage, pageSize }: { currentPage: number; pageSize: number }) =>
        useInstalledIntegrations(filters, { currentPage, pageSize }),
      {
        initialProps: { currentPage: 1, pageSize: 2 },
      }
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        total: 5,
        installedPackages: [
          expect.objectContaining({ id: 'aws' }),
          expect.objectContaining({ id: 'azure' }),
        ],
      })
    );

    rerender({ currentPage: 2, pageSize: 2 });

    expect(result.current).toEqual(
      expect.objectContaining({
        total: 5,
        installedPackages: [
          expect.objectContaining({ id: 'nginx' }),
          expect.objectContaining({ id: 'apache' }),
        ],
      })
    );

    rerender({ currentPage: 3, pageSize: 2 });

    expect(result.current).toEqual(
      expect.objectContaining({
        total: 5,
        installedPackages: [expect.objectContaining({ id: 'mysql' })],
      })
    );
  });
});
