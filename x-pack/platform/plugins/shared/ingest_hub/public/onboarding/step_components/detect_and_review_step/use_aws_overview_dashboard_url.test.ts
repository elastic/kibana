/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { KibanaAssetReference } from '@kbn/fleet-plugin/common';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  useAwsOverviewDashboardUrl,
  type InstallationSnapshot,
} from './use_aws_overview_dashboard_url';

const mockUseKibana = useKibana as jest.Mock;
const mockPrepend = jest.fn((path: string) => `/base${path}`);
const mockGetActiveSpace = jest.fn();

function setupKibana(spaceId?: string) {
  mockGetActiveSpace.mockResolvedValue(spaceId ? { id: spaceId } : undefined);
  mockUseKibana.mockReturnValue({
    services: {
      http: { basePath: { prepend: mockPrepend } },
      spaces: spaceId !== undefined ? { getActiveSpace: mockGetActiveSpace } : undefined,
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupKibana('default');
});

// The canonical package ID for [Metrics AWS] Overview, as shipped in elastic/integrations.
const OVERVIEW_ID = 'aws-fac28650-7349-11e9-816b-07687310a99a';

// Cast as KibanaAssetReference — avoids assigning the string literal 'dashboard' to the
// KibanaSavedObjectType enum under CI's tsconfig.type_check.json compiled resolution.
const primaryRef = { id: OVERVIEW_ID, type: 'dashboard' } as KibanaAssetReference;
const otherRef = { id: 'aws-ec2-id', type: 'dashboard' } as KibanaAssetReference;

describe('useAwsOverviewDashboardUrl', () => {
  it('returns undefined when installationInfo is undefined', async () => {
    const { result } = renderHook(() => useAwsOverviewDashboardUrl(undefined));
    await act(async () => {});
    expect(result.current).toBeUndefined();
  });

  it('returns undefined on first render when spaces service is present (prevents broken-link window)', () => {
    // spaces is defined (setupKibana('default') in beforeEach), so currentSpaceId starts
    // undefined. The hook must not emit a href until getActiveSpace() resolves — a broken
    // link is worse than a button without an href.
    const info: InstallationSnapshot = {
      installed_kibana: [primaryRef],
      installed_kibana_space_id: 'default',
    };
    const { result } = renderHook(() => useAwsOverviewDashboardUrl(info));
    // Do NOT await — check synchronous first-render value before the effect runs.
    expect(result.current).toBeUndefined();
  });

  describe('primary space (installed_kibana_space_id === currentSpaceId)', () => {
    it('returns the basePath-prefixed URL when the overview ref is in installed_kibana', async () => {
      const info: InstallationSnapshot = {
        installed_kibana: [otherRef, primaryRef],
        installed_kibana_space_id: 'default',
      };
      const { result } = renderHook(() => useAwsOverviewDashboardUrl(info));
      await act(async () => {});
      expect(result.current).toBe(`/base/app/dashboards#/view/${OVERVIEW_ID}`);
    });

    it('returns undefined when the overview dashboard is not in installed_kibana', async () => {
      const info: InstallationSnapshot = {
        installed_kibana: [otherRef],
        installed_kibana_space_id: 'default',
      };
      const { result } = renderHook(() => useAwsOverviewDashboardUrl(info));
      await act(async () => {});
      expect(result.current).toBeUndefined();
    });

    it('treats missing installed_kibana_space_id as primary space', async () => {
      const info: InstallationSnapshot = {
        installed_kibana: [primaryRef],
      };
      const { result } = renderHook(() => useAwsOverviewDashboardUrl(info));
      await act(async () => {});
      expect(result.current).toBe(`/base/app/dashboards#/view/${OVERVIEW_ID}`);
    });
  });

  describe('non-primary space (installed_kibana_space_id !== currentSpaceId)', () => {
    const SPACE_LOCAL_ID = 'some-space-specific-uuid';

    beforeEach(() => setupKibana('my-space'));

    it('returns the URL using the space-local id matched by originId', async () => {
      const info: InstallationSnapshot = {
        installed_kibana: [primaryRef], // primary space refs (different space)
        installed_kibana_space_id: 'default',
        additional_spaces_installed_kibana: {
          'my-space': [
            {
              id: SPACE_LOCAL_ID,
              originId: OVERVIEW_ID,
              type: 'dashboard',
            } as KibanaAssetReference,
          ],
        },
      };
      const { result } = renderHook(() => useAwsOverviewDashboardUrl(info));
      await act(async () => {});
      expect(result.current).toBe(`/base/app/dashboards#/view/${SPACE_LOCAL_ID}`);
    });

    it('returns undefined when the current space has no additional_spaces entry', async () => {
      const info: InstallationSnapshot = {
        installed_kibana: [primaryRef],
        installed_kibana_space_id: 'default',
        additional_spaces_installed_kibana: {},
      };
      const { result } = renderHook(() => useAwsOverviewDashboardUrl(info));
      await act(async () => {});
      expect(result.current).toBeUndefined();
    });

    it('returns undefined when the space entry exists but has no overview dashboard', async () => {
      const info: InstallationSnapshot = {
        installed_kibana: [primaryRef],
        installed_kibana_space_id: 'default',
        additional_spaces_installed_kibana: {
          'my-space': [
            {
              id: 'some-other-uuid',
              originId: 'aws-ec2-id',
              type: 'dashboard',
            } as KibanaAssetReference,
          ],
        },
      };
      const { result } = renderHook(() => useAwsOverviewDashboardUrl(info));
      await act(async () => {});
      expect(result.current).toBeUndefined();
    });
  });

  describe('spaces service unavailable', () => {
    beforeEach(() => setupKibana(undefined));

    it('falls back to primary space logic when spaces service is absent', async () => {
      const info: InstallationSnapshot = {
        installed_kibana: [primaryRef],
        installed_kibana_space_id: 'default',
      };
      const { result } = renderHook(() => useAwsOverviewDashboardUrl(info));
      await act(async () => {});
      expect(result.current).toBe(`/base/app/dashboards#/view/${OVERVIEW_ID}`);
    });
  });
});
