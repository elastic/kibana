/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { render, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { of } from 'rxjs';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../constants';
import { getAnomalySwimLaneEmbeddableFactory } from './anomaly_swimlane_embeddable_factory';
import type { AnomalySwimLaneEmbeddableApi, AnomalySwimLaneEmbeddableState } from './types';

// Mock dependencies
const pluginStartDeps = {
  data: dataPluginMock.createStartContract(),
  charts: chartPluginMock.createStartContract(),
};

const getStartServices = coreMock.createSetup({
  pluginStartDeps,
}).getStartServices;

const mockResponse = of([
  {
    job_id: 'my-job',
    analysis_config: { bucket_span: '15m' },
  },
]);

jest.mock('../../application/services/anomaly_detector_service', () => {
  return {
    AnomalyDetectorService: jest.fn().mockImplementation(() => {
      return {
        getJobs$: jest.fn((jobId: string[]) => {
          if (jobId.includes('invalid-job-id')) {
            throw new Error('Invalid job');
          }
          return mockResponse;
        }),
      };
    }),
  };
});

jest.mock('../../application/services/anomaly_timeline_service', () => {
  return {
    AnomalyTimelineService: jest.fn().mockImplementation(() => {
      return {
        setTimeRange: jest.fn(),
        loadOverallData: jest.fn(() =>
          Promise.resolve({
            earliest: 0,
            latest: 0,
            points: [],
            interval: 3600,
          })
        ),
        loadViewBySwimlane: jest.fn(() =>
          Promise.resolve({
            points: [],
          })
        ),
        getSwimlaneBucketInterval: jest.fn(() => {
          return {
            asSeconds: jest.fn(() => 900),
          };
        }),
      };
    }),
  };
});

describe('getAnomalySwimLaneEmbeddableFactory', () => {
  const factory = getAnomalySwimLaneEmbeddableFactory(getStartServices);

  it('should init embeddable api based on provided state', async () => {
    const uuid = '1234';
    const parentApi = {
      executionContext: {
        type: 'dashboard',
        id: 'dashboard-id',
      },
    };
    const { api, Component } = await factory.buildEmbeddable({
      initialState: {
        swimlaneType: 'viewBy',
        jobIds: ['my-job'],
        viewBy: 'overall',
      } satisfies AnomalySwimLaneEmbeddableState,
      finalizeApi: (preFinalizeApi) => {
        return {
          ...preFinalizeApi,
          uuid,
          parentApi,
          type: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
        } as AnomalySwimLaneEmbeddableApi;
      },
      parentApi,
      uuid,
    });

    render(<Component />);

    await waitFor(() => {
      expect(api.dataLoading$?.value).toEqual(false);
      expect(api.jobIds.value).toEqual(['my-job']);
      expect(api.viewBy.value).toEqual('overall');

      expect(screen.getByTestId<HTMLElement>('mlSwimLaneEmbeddable_1234')).toBeInTheDocument();
    });
  });
});
