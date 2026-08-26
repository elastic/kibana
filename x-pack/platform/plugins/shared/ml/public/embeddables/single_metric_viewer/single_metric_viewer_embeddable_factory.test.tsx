/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { act, render, waitFor, screen } from '@testing-library/react';
import React from 'react';
import type { SingleMetricViewerEmbeddableState } from '@kbn/ml-server-schemas/embeddables/single_metric_viewer';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '@kbn/ml-common-types/embeddables/single_metric_viewer';
import { dispatchRenderComplete, dispatchRenderStart } from '@kbn/kibana-utils-plugin/public';
import { getSingleMetricViewerEmbeddableFactory } from './single_metric_viewer_embeddable_factory';
import type { SingleMetricViewerEmbeddableApi } from '../types';
import type { SingleMetricViewerProps } from '../../shared_components/single_metric_viewer/single_metric_viewer';

const mockPluginStartDeps = {
  data: dataPluginMock.createStartContract(),
};

const getStartServices = coreMock.createSetup({
  pluginStartDeps: mockPluginStartDeps,
}).getStartServices;

jest.mock('@kbn/kibana-utils-plugin/public', () => {
  const actual = jest.requireActual('@kbn/kibana-utils-plugin/public');
  return {
    ...actual,
    dispatchRenderComplete: jest.fn(),
    dispatchRenderStart: jest.fn(),
  };
});

jest.mock('../../application/capabilities/check_capabilities', () => {
  return {
    checkPermissionAsync: jest.fn().mockResolvedValue(true),
  };
});

jest.mock('../common/use_embeddable_execution_context', () => ({
  useReactEmbeddableExecutionContext: jest.fn(),
}));

jest.mock('./get_services', () => {
  return {
    getServices: jest.fn().mockImplementation(async () => [
      {
        executionContext: {
          set: jest.fn(),
          clear: jest.fn(),
        },
        notifications: { toasts: {} },
      },
      mockPluginStartDeps,
      {},
    ]),
  };
});

let mockLatestSmvProps: SingleMetricViewerProps | undefined;

jest.mock('../../shared_components/single_metric_viewer', () => {
  return {
    getSingleMetricViewerComponent: () => {
      return function MockSingleMetricViewer(props: SingleMetricViewerProps) {
        mockLatestSmvProps = props;
        return (
          <div
            data-test-subj={`mlSingleMetricViewer_${props.uuid}`}
            data-shared-item=""
            data-render-complete={props.isRenderComplete ?? false}
            ref={props.wrapperRef}
          />
        );
      };
    },
  };
});

describe('getSingleMetricViewerEmbeddableFactory reporting readiness', () => {
  const factory = getSingleMetricViewerEmbeddableFactory(getStartServices);

  beforeEach(() => {
    mockLatestSmvProps = undefined;
    jest.clearAllMocks();
  });

  async function buildAndRender() {
    const uuid = 'smv-uuid';
    const parentApi = {
      executionContext: {
        type: 'dashboard',
        id: 'dashboard-id',
      },
    };
    const { api, Component } = await factory.buildEmbeddable({
      initializeDrilldownsManager: jest.fn(),
      initialState: {
        job_ids: ['my-job'],
        selected_detector_index: 0,
      } satisfies SingleMetricViewerEmbeddableState,
      finalizeApi: (preFinalizeApi) => {
        return {
          ...preFinalizeApi,
          uuid,
          parentApi,
          type: ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
        } as SingleMetricViewerEmbeddableApi;
      },
      parentApi,
      uuid,
    });

    const result = render(<Component />);
    await waitFor(() => {
      expect(screen.getByTestId('mlSingleMetricViewer_smv-uuid')).toBeInTheDocument();
    });
    return { api, ...result };
  }

  it('starts with data-render-complete false so screenshotting waits', async () => {
    await buildAndRender();

    const wrapper = screen.getByTestId('mlSingleMetricViewer_smv-uuid');
    expect(wrapper).toHaveAttribute('data-render-complete', 'false');
    expect(dispatchRenderStart).toHaveBeenCalled();
  });

  it('marks render complete after onRenderComplete and dispatches renderComplete', async () => {
    const { api } = await buildAndRender();

    await act(async () => {
      mockLatestSmvProps?.onRenderComplete?.();
    });

    await waitFor(() => {
      const wrapper = screen.getByTestId('mlSingleMetricViewer_smv-uuid');
      expect(wrapper).toHaveAttribute('data-render-complete', 'true');
      expect(api.dataLoading$?.value).toEqual(false);
      expect(dispatchRenderComplete).toHaveBeenCalled();
    });
  });

  it('resets readiness when loading starts again', async () => {
    await buildAndRender();

    await act(async () => {
      mockLatestSmvProps?.onRenderComplete?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mlSingleMetricViewer_smv-uuid')).toHaveAttribute(
        'data-render-complete',
        'true'
      );
    });

    await act(async () => {
      mockLatestSmvProps?.onLoading?.(true);
    });

    await waitFor(() => {
      expect(screen.getByTestId('mlSingleMetricViewer_smv-uuid')).toHaveAttribute(
        'data-render-complete',
        'false'
      );
      expect(dispatchRenderStart).toHaveBeenCalled();
    });
  });

  it('marks render complete on error so reporting cannot hang', async () => {
    await buildAndRender();

    await act(async () => {
      mockLatestSmvProps?.onError?.(new Error('job missing'));
    });

    await waitFor(() => {
      const wrapper = screen.getByTestId('mlSingleMetricViewer_smv-uuid');
      expect(wrapper).toHaveAttribute('data-render-complete', 'true');
      expect(dispatchRenderComplete).toHaveBeenCalled();
    });
  });
});
