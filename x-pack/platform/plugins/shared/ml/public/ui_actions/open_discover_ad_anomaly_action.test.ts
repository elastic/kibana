/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlCoreSetup } from '../plugin';
import { checkPermissionAsync } from '../application/capabilities/check_capabilities';
import { showDiscoverADAnomalyFlyout } from '../embeddables/job_creation/discover_ad_anomaly';
import { hasLicenseAndConnector } from './has_license_and_connector';
import { createDiscoverADAnomalyAction } from './open_discover_ad_anomaly_action';

jest.mock('../application/capabilities/check_capabilities', () => ({
  checkPermissionAsync: jest.fn(),
}));
jest.mock('./has_license_and_connector', () => ({
  hasLicenseAndConnector: jest.fn(),
}));
jest.mock('../embeddables/job_creation/discover_ad_anomaly', () => ({
  showDiscoverADAnomalyFlyout: jest.fn().mockResolvedValue(undefined),
}));

const coreStart = { core: true };
const pluginsStart = {
  share: { share: true },
  data: { data: true },
  dashboard: { dashboard: true },
};

const setup = ({ canGetJobs = true, isAiAvailable = true } = {}) => {
  (checkPermissionAsync as jest.Mock).mockResolvedValue(canGetJobs);
  (hasLicenseAndConnector as jest.Mock).mockResolvedValue(isAiAvailable);
  const getStartServices = jest
    .fn()
    .mockResolvedValue([coreStart, pluginsStart]) as unknown as MlCoreSetup['getStartServices'];
  return createDiscoverADAnomalyAction(getStartServices);
};

const context = {
  jobId: 'my-job',
  timestamp: 1700000000000,
  endTimestamp: 1700003600000,
  score: 73,
};

describe('createDiscoverADAnomalyAction', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the flyout with the job, time and score of the anomaly', async () => {
    await setup().execute(context as never);
    expect(showDiscoverADAnomalyFlyout).toHaveBeenCalledWith(
      coreStart,
      pluginsStart.share,
      pluginsStart.data,
      pluginsStart.dashboard,
      pluginsStart,
      context,
      true
    );
  });

  it('tells the flyout when AI is not available', async () => {
    await setup({ isAiAvailable: false }).execute(context as never);
    expect(showDiscoverADAnomalyFlyout).toHaveBeenCalledWith(
      coreStart,
      pluginsStart.share,
      pluginsStart.data,
      pluginsStart.dashboard,
      pluginsStart,
      context,
      false
    );
  });

  it('is compatible with a job and permission to get jobs', async () => {
    expect(await setup().isCompatible!(context as never)).toBe(true);
  });

  it('is not compatible without a job', async () => {
    expect(await setup().isCompatible!({ ...context, jobId: '' } as never)).toBe(false);
  });

  it('is not compatible without permission to get jobs', async () => {
    expect(await setup({ canGetJobs: false }).isCompatible!(context as never)).toBe(false);
  });
});
