/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { InferenceEndpoints } from './inference_endpoints';

const mockRefetch = jest.fn();

jest.mock('../hooks/use_inference_endpoints', () => ({
  useQueryInferenceEndpoints: jest.fn(),
}));

jest.mock('../hooks/use_delete_endpoint', () => ({
  useDeleteEndpoint: () => ({
    mutate: jest.fn().mockImplementation(() => Promise.resolve()),
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const actual = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...actual,
    useKibana: jest.fn(() => ({
      services: {
        cloud: { isCloudEnabled: false },
        application: {
          capabilities: {
            cloudConnect: { show: true, configure: true },
          },
          navigateToApp: jest.fn(),
        },
        uiSettings: {
          get: jest.fn(),
        },
      },
    })),
  };
});

const { useQueryInferenceEndpoints } = jest.requireMock('../hooks/use_inference_endpoints');
const { useKibana } = jest.requireMock('@kbn/kibana-react-plugin/public');

const setEisFeatureFlag = (enabled: boolean) => {
  useKibana.mockReturnValue({
    services: {
      cloud: { isCloudEnabled: false },
      application: {
        capabilities: {
          cloudConnect: { show: true, configure: true },
        },
        navigateToApp: jest.fn(),
      },
      uiSettings: {
        get: jest.fn((key: string, defaultValue: boolean) => {
          if (key === 'searchInferenceEndpoints:elasticInferenceServiceEnabled') {
            return enabled;
          }
          return defaultValue;
        }),
      },
    },
  });
};

const mixedEndpoints: InferenceAPIConfigResponse[] = [
  {
    inference_id: '.elser-2-elasticsearch',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: { num_allocations: 1, num_threads: 1, model_id: '.elser_model_2' },
    task_settings: {},
  },
  {
    inference_id: '.rerank-v1-elastic',
    task_type: 'rerank',
    service: 'elastic',
    service_settings: { model_id: 'rerank-v1' },
  },
  {
    inference_id: 'my-openai-endpoint',
    task_type: 'completion',
    service: 'openai',
    service_settings: { model_id: 'gpt-4o' },
    task_settings: {},
  },
  {
    inference_id: 'user-elasticsearch-endpoint',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: { num_allocations: 1, num_threads: 1, model_id: 'custom_model' },
    task_settings: {},
  },
] as InferenceAPIConfigResponse[];

const onlyElasticEndpoints: InferenceAPIConfigResponse[] = [
  {
    inference_id: '.elser-2-elasticsearch',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: { num_allocations: 1, num_threads: 1, model_id: '.elser_model_2' },
    task_settings: {},
  },
  {
    inference_id: '.rerank-v1-elastic',
    task_type: 'rerank',
    service: 'elastic',
    service_settings: { model_id: 'rerank-v1' },
  },
] as InferenceAPIConfigResponse[];

const renderComponent = () => {
  return render(
    <EuiThemeProvider>
      <I18nProvider>
        <InferenceEndpoints />
      </I18nProvider>
    </EuiThemeProvider>
  );
};

describe('InferenceEndpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with EIS feature flag disabled', () => {
    beforeEach(() => {
      setEisFeatureFlag(false);
    });

    it('renders all endpoints including elastic and preconfigured', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: mixedEndpoints,
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.getByTestId('allInferenceEndpointsPage')).toBeInTheDocument();
      expect(screen.queryByTestId('externalInferenceEmptyPrompt')).not.toBeInTheDocument();
    });

    it('shows loading spinner while data is loading', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.getByTestId('inferenceEndpointsLoading')).toBeInTheDocument();
      expect(screen.queryByTestId('externalInferenceEmptyPrompt')).not.toBeInTheDocument();
      expect(screen.queryByTestId('allInferenceEndpointsPage')).not.toBeInTheDocument();
    });

    it('does not show empty prompt when no endpoints exist', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.getByTestId('allInferenceEndpointsPage')).toBeInTheDocument();
      expect(screen.queryByTestId('externalInferenceEmptyPrompt')).not.toBeInTheDocument();
    });
  });

  describe('with EIS feature flag enabled', () => {
    beforeEach(() => {
      setEisFeatureFlag(true);
    });

    it('shows loading spinner while data is loading', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.getByTestId('inferenceEndpointsLoading')).toBeInTheDocument();
      expect(screen.queryByTestId('externalInferenceEmptyPrompt')).not.toBeInTheDocument();
      expect(screen.queryByTestId('allInferenceEndpointsPage')).not.toBeInTheDocument();
    });

    it('shows empty prompt when only elastic and preconfigured endpoints exist', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: onlyElasticEndpoints,
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.getByTestId('externalInferenceEmptyPrompt')).toBeInTheDocument();
      expect(screen.getByText('Connect to external model providers')).toBeInTheDocument();
      expect(screen.getByTestId('addEndpointButton')).toBeInTheDocument();
      expect(screen.getByTestId('viewDocumentationLink')).toBeInTheDocument();
      expect(screen.queryByTestId('allInferenceEndpointsPage')).not.toBeInTheDocument();
    });

    it('shows tabular view when third-party endpoints exist', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: mixedEndpoints,
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.getByTestId('externalInferenceHeader')).toBeInTheDocument();
      expect(screen.queryByTestId('externalInferenceEmptyPrompt')).not.toBeInTheDocument();
    });

    it('filters out elastic service endpoints', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: mixedEndpoints,
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.queryByText('.rerank-v1-elastic')).not.toBeInTheDocument();
    });

    it('filters out preconfigured endpoints', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: mixedEndpoints,
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.queryByText('.elser-2-elasticsearch')).not.toBeInTheDocument();
    });

    it('keeps user-created third-party endpoints', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: mixedEndpoints,
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.getByText('my-openai-endpoint')).toBeInTheDocument();
    });

    it('filters out elasticsearch service endpoints', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: mixedEndpoints,
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.queryByText('user-elasticsearch-endpoint')).not.toBeInTheDocument();
    });

    it('renders clickable Add Endpoint button in empty prompt', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: onlyElasticEndpoints,
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      const addButton = screen.getByTestId('addEndpointButton');
      expect(addButton).toBeInTheDocument();
      expect(addButton).toBeEnabled();
    });

    it('shows External Inference as page title', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: mixedEndpoints,
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.getByText('External Inference')).toBeInTheDocument();
    });

    it('hides EIS documentation and ML Trained Models links', () => {
      useQueryInferenceEndpoints.mockReturnValue({
        data: mixedEndpoints,
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.queryByTestId('eis-documentation')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-your-models')).not.toBeInTheDocument();
      expect(screen.getByTestId('api-documentation')).toBeInTheDocument();
    });
  });
});
