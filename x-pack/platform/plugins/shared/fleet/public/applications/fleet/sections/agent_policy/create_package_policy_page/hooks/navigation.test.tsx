/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderHook } from '@testing-library/react';

import { useCancelAddPackagePolicy } from './navigation';

const mockNavigateToApp = jest.fn();
const mockGetUrlForApp = jest.fn(
  (appId: string, opts?: { path?: string }) =>
    `http://localhost:5620/app/${appId}${opts?.path ?? ''}`
);
const mockGetHref = jest.fn((page: string, params?: Record<string, string>) => {
  if (page === 'integration_details_overview') return `/detail/${params?.pkgkey}/overview`;
  if (page === 'policy_details') return `/fleet/policies/${params?.policyId}`;
  if (page === 'integrations_installed') return '/installed';
  return page;
});

jest.mock('../../../../hooks', () => ({
  useStartServices: jest.fn(() => ({
    application: {
      navigateToApp: mockNavigateToApp,
      getUrlForApp: mockGetUrlForApp,
    },
  })),
  useLink: jest.fn(() => ({ getHref: mockGetHref })),
  useIntraAppState: jest.fn(() => undefined),
}));

const renderWithSearch = (search: string) =>
  renderHook(
    () =>
      useCancelAddPackagePolicy({
        from: 'package',
        pkgkey: 'nginx-1.3.0',
        agentPolicyId: undefined,
      }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={[{ pathname: '/add-integration', search }]}>
          {children}
        </MemoryRouter>
      ),
    }
  );

describe('useCancelAddPackagePolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cancelUrl', () => {
    it('uses returnPath/returnAppId to return to the Integrations catalog with flyout open', () => {
      const { result } = renderWithSearch(
        '?returnAppId=integrations&returnPath=%2Fbrowse%3Fcollection%3Dnginx'
      );
      expect(mockGetUrlForApp).toHaveBeenCalledWith('integrations', {
        path: '/browse?collection=nginx',
      });
      expect(result.current.cancelUrl).toBe(
        'http://localhost:5620/app/integrations/browse?collection=nginx'
      );
    });

    it('uses returnPath/returnAppId to return to Observability Onboarding with collection open', () => {
      const { result } = renderWithSearch(
        '?returnAppId=observabilityOnboarding&returnPath=%3Fsearch%3Dng%26collection%3Dnginx'
      );
      expect(mockGetUrlForApp).toHaveBeenCalledWith('observabilityOnboarding', {
        path: '?search=ng&collection=nginx',
      });
      expect(result.current.cancelUrl).toBe(
        'http://localhost:5620/app/observabilityOnboarding?search=ng&collection=nginx'
      );
    });

    it('uses returnPath/returnAppId to return to Security Solution', () => {
      const { result } = renderWithSearch(
        '?returnAppId=securitySolutionUI&returnPath=%2Fget_started'
      );
      expect(mockGetUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
        path: '/get_started',
      });
      expect(result.current.cancelUrl).toBe(
        'http://localhost:5620/app/securitySolutionUI/get_started'
      );
    });

    it('ignores an unknown returnAppId and falls back to integration overview', () => {
      const { result } = renderWithSearch('?returnAppId=unknownApp&returnPath=%2Fsome%2Fpath');
      expect(mockGetUrlForApp).not.toHaveBeenCalled();
      expect(result.current.cancelUrl).toBe('/detail/nginx-1.3.0/overview');
    });

    it('falls back to integration overview when no query params are present', () => {
      const { result } = renderWithSearch('');
      expect(result.current.cancelUrl).toBe('/detail/nginx-1.3.0/overview');
    });
  });
});
