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
import { BehaviorSubject, of } from 'rxjs';
import type { AnomalySwimLaneEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '@kbn/ml-common-types/embeddables/anomaly_swimlane';
import { getAnomalySwimLaneEmbeddableFactory } from './anomaly_swimlane_embeddable_factory';
import type { AnomalySwimLaneEmbeddableApi } from './types';

const mockSwimlaneContainer = jest.fn();
jest.mock('../../application/explorer/swimlane_container', () => ({
  isViewBySwimLaneData: jest.fn(() => false),
  SwimlaneContainer: (props: Record<string, unknown>) => {
    mockSwimlaneContainer(props);
    // The real SwimlaneContainer calls onResize on mount, which triggers the chartWidth$
    // observable that the data fetcher subscribes to. Simulate that here.
    React.useEffect(() => {
      (props.onResize as (size: number) => void)?.(800);
    }, [props.onResize]);
    return <div data-test-subj={props['data-test-subj'] as string} />;
  },
}));

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

jest.mock('../../application/capabilities/check_capabilities', () => {
  return {
    checkPermissionAsync: jest.fn().mockResolvedValue(true),
  };
});

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
      initializeDrilldownsManager: jest.fn(),
      initialState: {
        swimlane_type: 'viewBy',
        job_ids: ['my-job'],
        view_by: 'overall',
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

  describe('non-interactive mode', () => {
    it('passes undefined onCellsSelection and onPaginationChange when viewMode is non-interactive', async () => {
      const uuid = 'preview-uuid';
      const viewMode$ = new BehaviorSubject<'non-interactive'>('non-interactive');
      const parentApi = {
        executionContext: { type: 'dashboard', id: 'dashboard-id' },
        viewMode$,
      };

      const { Component } = await factory.buildEmbeddable({
        initializeDrilldownsManager: jest.fn(),
        initialState: {
          swimlane_type: 'viewBy',
          job_ids: ['my-job'],
          view_by: 'overall',
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

      mockSwimlaneContainer.mockClear();
      render(<Component />);

      await waitFor(() => {
        expect(mockSwimlaneContainer).toHaveBeenCalled();
        const lastProps = mockSwimlaneContainer.mock.calls.at(-1)?.[0];
        expect(lastProps?.onCellsSelection).toBeUndefined();
      });
    });
  });
});
