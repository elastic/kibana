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

const anomalyDetectionAppId = 'anomaly_detection';
const dfaAppId = 'analytics';

describe('ML management internal locator', () => {
  const mlManagementLocatorInternal = new MlManagementLocatorInternal(
    mockShareService as unknown as SharePublicStart
  );

  describe('Job Management Page', () => {
    it('should generate valid URL for the Anomaly Detection job management page', async () => {
      const { url } = await mlManagementLocatorInternal.getUrl(
        {
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
        },
        anomalyDetectionAppId
      );
      expect(url).toEqual('/app/management/ml/anomaly_detection');
    });

    it('should generate valid URL for the Anomaly Detection job management page for job', async () => {
      const { url } = await mlManagementLocatorInternal.getUrl(
        {
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
          pageState: {
            jobId: 'fq_single_1',
          },
        },
        anomalyDetectionAppId
      );

      expect(url).toEqual(
        "/app/management/ml/anomaly_detection?_a=(jobs:(queryText:'id:fq_single_1'))"
      );
    });

    it('should generate valid URL for the Anomaly Detection job management page for groupIds', async () => {
      const { url } = await mlManagementLocatorInternal.getUrl(
        {
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
          pageState: {
            groupIds: ['farequote', 'categorization'],
          },
        },
        anomalyDetectionAppId
      );

      expect(url).toEqual(
        "/app/management/ml/anomaly_detection?_a=(jobs:(queryText:'groups:(farequote%20or%20categorization)'))"
      );
    });

    it('should generate valid URL for the page for selecting the type of anomaly detection job to create', async () => {
      const { url } = await mlManagementLocatorInternal.getUrl({
        page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE,
        pageState: {
          index: `3da93760-e0af-11ea-9ad3-3bcfc330e42a`,
          globalState: {
            time: {
              from: 'now-30m',
              to: 'now',
            },
          },
        },
      });

      expect(url).toEqual(
        '/app/management/ml/anomaly_detection/jobs/new_job/step/job_type?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a&_g=(time:(from:now-30m,to:now))'
      );
    });
  });

  describe('DataFrameAnalytics job management page', () => {
    it('should generate valid URL for the Data Frame Analytics job management page', async () => {
      const { url } = await mlManagementLocatorInternal.getUrl(
        {
          page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
        },
        dfaAppId
      );

      expect(url).toEqual('/app/management/ml/analytics');
    });

    it('should generate valid URL for the Data Frame Analytics job management page with jobId', async () => {
      const { url } = await mlManagementLocatorInternal.getUrl(
        {
          page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
          pageState: {
            jobId: 'grid_regression_1',
          },
        },
        dfaAppId
      );

      expect(url).toEqual(
        "/app/management/ml/analytics?_a=(data_frame_analytics:(queryText:'id:grid_regression_1'))"
      );
    });

    it('should generate valid URL for the Data Frame Analytics job management page with groupIds', async () => {
      const { url } = await mlManagementLocatorInternal.getUrl(
        {
          page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
          pageState: {
            groupIds: ['group_1', 'group_2'],
          },
        },
        dfaAppId
      );

      expect(url).toEqual(
        "/app/management/ml/analytics?_a=(data_frame_analytics:(queryText:'groups:(group_1%20or%20group_2)'))"
      );
    });
  });

  describe('Trained Models', () => {
    it('should generate valid URL for the Trained Models page with model id', async () => {
      const { url } = await mlManagementLocatorInternal.getUrl(
        {
          page: ML_PAGES.TRAINED_MODELS_MANAGE,
          pageState: {
            modelId: 'my_model_01',
          },
        },
        'trained_models'
      );

      expect(url).toEqual(
        "/app/management/ml/trained_models?_a=(trained_models:(queryText:'model_id:(my_model_01)'))"
      );
    });
  });
});
