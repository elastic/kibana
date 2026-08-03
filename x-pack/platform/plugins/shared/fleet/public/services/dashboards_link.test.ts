/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDashboardsCount, buildDashboardsListLink } from './dashboards_link';
import type { InstallationInfo } from '../../common/types/models';
import { KibanaSavedObjectType } from '../../common/types/models';

const makeDashboardAsset = (id: string) => ({
  id,
  type: KibanaSavedObjectType.dashboard,
  originId: undefined,
});

const makeVisualizationAsset = (id: string) => ({
  id,
  type: KibanaSavedObjectType.visualization,
  originId: undefined,
});

describe('getDashboardsCount', () => {
  const defaultSpaceId = 'default';

  it('returns 0 when installed_kibana is empty', () => {
    const installationInfo = {
      installed_kibana_space_id: defaultSpaceId,
      installed_kibana: [],
    } as unknown as InstallationInfo;

    expect(getDashboardsCount(installationInfo, defaultSpaceId)).toBe(0);
  });

  it('counts only dashboard assets in the primary space', () => {
    const installationInfo = {
      installed_kibana_space_id: defaultSpaceId,
      installed_kibana: [
        makeDashboardAsset('dash-1'),
        makeDashboardAsset('dash-2'),
        makeVisualizationAsset('viz-1'),
      ],
    } as unknown as InstallationInfo;

    expect(getDashboardsCount(installationInfo, defaultSpaceId)).toBe(2);
  });

  it('reads from additional_spaces_installed_kibana when space does not match primary', () => {
    const installationInfo = {
      installed_kibana_space_id: defaultSpaceId,
      installed_kibana: [makeDashboardAsset('dash-primary')],
      additional_spaces_installed_kibana: {
        'custom-space': [makeDashboardAsset('dash-custom-1'), makeDashboardAsset('dash-custom-2')],
      },
    } as unknown as InstallationInfo;

    expect(getDashboardsCount(installationInfo, 'custom-space')).toBe(2);
  });

  it('returns 0 when the requested space has no assets', () => {
    const installationInfo = {
      installed_kibana_space_id: defaultSpaceId,
      installed_kibana: [makeDashboardAsset('dash-primary')],
      additional_spaces_installed_kibana: {},
    } as unknown as InstallationInfo;

    expect(getDashboardsCount(installationInfo, 'nonexistent-space')).toBe(0);
  });

  it('defaults to DEFAULT_SPACE_ID when spaceId is omitted', () => {
    const installationInfo = {
      installed_kibana_space_id: 'default',
      installed_kibana: [makeDashboardAsset('dash-1')],
    } as unknown as InstallationInfo;

    expect(getDashboardsCount(installationInfo)).toBe(1);
  });
});

describe('buildDashboardsListLink', () => {
  const mockBasePath = {
    prepend: (path: string) => `/mock${path}`,
  };

  it('returns a URL prepended with base path pointing to the dashboards list', () => {
    const link = buildDashboardsListLink(mockBasePath as any, 'AWS');
    expect(link).toMatch(/^\/mock\/app\/dashboards#\/list/);
  });

  it('includes the package title as a tag query param', () => {
    const link = buildDashboardsListLink(mockBasePath as any, 'AWS');
    expect(link).toContain('s=');
    expect(link).toContain('AWS');
  });

  it('builds different URLs for different package titles', () => {
    const awsLink = buildDashboardsListLink(mockBasePath as any, 'AWS');
    const cspmLink = buildDashboardsListLink(mockBasePath as any, 'Security Posture Management');
    expect(awsLink).not.toBe(cspmLink);
  });
});
