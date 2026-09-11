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

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useAwsOverviewDashboardUrl } from './use_aws_overview_dashboard_url';

const mockUseKibana = useKibana as jest.Mock;
const mockPrepend = jest.fn((path: string) => `/base${path}`);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseKibana.mockReturnValue({
    services: { http: { basePath: { prepend: mockPrepend } } },
  });
});

// The canonical package ID for [Metrics AWS] Overview, as shipped in elastic/integrations.
const OVERVIEW_ID = 'aws-fac28650-7349-11e9-816b-07687310a99a';

describe('useAwsOverviewDashboardUrl', () => {
  it('returns undefined when installedKibana is empty', () => {
    const { result } = renderHook(() => useAwsOverviewDashboardUrl([]));
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when no dashboard ref matches the overview ID', () => {
    const { result } = renderHook(() =>
      useAwsOverviewDashboardUrl([{ id: 'aws-some-other-id', type: 'dashboard' as any }])
    );
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the ref type is not dashboard', () => {
    const { result } = renderHook(() =>
      useAwsOverviewDashboardUrl([{ id: OVERVIEW_ID, type: 'index-pattern' as any }])
    );
    expect(result.current).toBeUndefined();
  });

  it('returns the basePath-prefixed URL when a ref matches by id (default space)', () => {
    const { result } = renderHook(() =>
      useAwsOverviewDashboardUrl([{ id: OVERVIEW_ID, type: 'dashboard' as any }])
    );
    expect(result.current).toBe(`/base/app/dashboards#/view/${OVERVIEW_ID}`);
    expect(mockPrepend).toHaveBeenCalledWith(`/app/dashboards#/view/${OVERVIEW_ID}`);
  });

  it('returns the basePath-prefixed URL using the space-local id when originId matches (non-default space)', () => {
    const spaceLocalId = 'some-space-specific-uuid';
    const { result } = renderHook(() =>
      useAwsOverviewDashboardUrl([
        { id: spaceLocalId, originId: OVERVIEW_ID, type: 'dashboard' as any },
      ])
    );
    expect(result.current).toBe(`/base/app/dashboards#/view/${spaceLocalId}`);
    expect(mockPrepend).toHaveBeenCalledWith(`/app/dashboards#/view/${spaceLocalId}`);
  });

  it('picks the overview ref and ignores other dashboard refs', () => {
    const { result } = renderHook(() =>
      useAwsOverviewDashboardUrl([
        { id: 'aws-ec2-dashboard', type: 'dashboard' as any },
        { id: OVERVIEW_ID, type: 'dashboard' as any },
        { id: 'aws-s3-dashboard', type: 'dashboard' as any },
      ])
    );
    expect(result.current).toBe(`/base/app/dashboards#/view/${OVERVIEW_ID}`);
  });
});
