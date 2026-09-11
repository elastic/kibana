/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@kbn/react-query';
import { useAwsOverviewDashboardUrl } from './use_aws_overview_dashboard_url';

const mockUseKibana = useKibana as jest.Mock;
const mockUseQuery = useQuery as jest.Mock;

const mockPrepend = jest.fn((path: string) => `/base${path}`);
const httpMock = {
  post: jest.fn(),
  basePath: { prepend: mockPrepend },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseKibana.mockReturnValue({ services: { http: httpMock } });
  mockUseQuery.mockReturnValue({ data: undefined });
});

// KibanaSavedObjectType.dashboard === 'dashboard'
const dashboardRef = { id: 'aws-overview-id', type: 'dashboard' };
const nonDashboardRef = { id: 'index-1', type: 'index-pattern' };

describe('useAwsOverviewDashboardUrl', () => {
  it('is disabled when no dashboard assets are installed', () => {
    renderHook(() => useAwsOverviewDashboardUrl([nonDashboardRef as any]));
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.enabled).toBe(false);
  });

  it('is enabled when dashboard assets are present', () => {
    renderHook(() => useAwsOverviewDashboardUrl([dashboardRef as any]));
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.enabled).toBe(true);
  });

  it('returns undefined when useQuery has no data yet', () => {
    mockUseQuery.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useAwsOverviewDashboardUrl([dashboardRef as any]));
    expect(result.current).toBeUndefined();
  });

  it('returns the resolved href from useQuery data', () => {
    mockUseQuery.mockReturnValue({ data: '/base/app/dashboards#/view/aws-overview-id' });
    const { result } = renderHook(() => useAwsOverviewDashboardUrl([dashboardRef as any]));
    expect(result.current).toBe('/base/app/dashboards#/view/aws-overview-id');
  });

  it('uses staleTime: Infinity to avoid re-fetching on every render', () => {
    renderHook(() => useAwsOverviewDashboardUrl([dashboardRef as any]));
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.staleTime).toBe(Infinity);
  });
});
