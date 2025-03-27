/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { MlManagementLocatorInternal } from './ml_management_locator';
import { ML_PAGES } from '../../common/constants/locator';

const mockShareService = {
  url: {
    locators: {
      get: jest.fn(() => {
        // MlManagementLocatorInternal wraps the management locator (getUrl mocked below) and adds path formatting to match ML app paths
        return {
          getUrl: async ({ sectionId, appId }: { sectionId: string; appId: string }) => {
            return `/app/management/${sectionId}/${appId}`;
          },
        };
      }),
    },
  },
};

const jobIds = ['test-job-id-0', 'test-job-id-1'];
const groupIds = ['test-group-id-0'];

const basicJobsManageParams = {
  page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  pageState: {
    jobId: jobIds[0],
  },
};

const jobsManageParamsGroupId = {
  page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  pageState: {
    groupIds,
    globalState: {
      time: { from: 'now-1h', to: 'now' },
      refreshInterval: { pause: true, value: 10000 },
    },
  },
};

const anomalyDetectionAppId = 'anomaly_detection';

describe('ML management internal locator', () => {
  const mlManagementLocatorInternal = new MlManagementLocatorInternal(
    mockShareService as unknown as SharePublicStart
  );

  it('should return the correct url for the given ML section and appId', async () => {
    const { url } = await mlManagementLocatorInternal.getUrl(
      basicJobsManageParams,
      anomalyDetectionAppId
    );
    const { url: paramsGroupIdUrl } = await mlManagementLocatorInternal.getUrl(
      jobsManageParamsGroupId,
      anomalyDetectionAppId
    );
    expect(url).toEqual(
      "/app/management/ml/anomaly_detection?_a=('':(queryText:'id:test-job-id-0'))"
    );
    expect(paramsGroupIdUrl).toEqual(
      "/app/management/ml/anomaly_detection?_a=('':(queryText:'groups:(test-group-id-0)'))&_g=(refreshInterval:(pause:!t,value:10000),time:(from:now-1h,to:now))"
    );
  });

  it('should return a valid path for the given ML section and appId', async () => {
    const { path } = await mlManagementLocatorInternal.getUrl(
      basicJobsManageParams,
      anomalyDetectionAppId
    );
    const { path: paramsGroupIdPath } = await mlManagementLocatorInternal.getUrl(
      jobsManageParamsGroupId,
      anomalyDetectionAppId
    );
    expect(path).toEqual("?_a=('':(queryText:'id:test-job-id-0'))");
    expect(paramsGroupIdPath).toEqual(
      "?_a=('':(queryText:'groups:(test-group-id-0)'))&_g=(refreshInterval:(pause:!t,value:10000),time:(from:now-1h,to:now))"
    );
  });
});
