/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { SubFeatureCard } from './sub_feature_card';
import { useQueryInferenceEndpoints } from '../../hooks/use_inference_endpoints';
import { useRegisteredFeatures } from '../../hooks/use_registered_features';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';

jest.mock('../../hooks/use_inference_endpoints');
jest.mock('../../hooks/use_registered_features');
jest.mock('./add_model_popover', () => ({
  AddModelPopover: ({
    existingEndpointIds,
    onAdd,
  }: {
    existingEndpointIds: string[];
    onAdd: (id: string) => void;
  }) => (
    <button data-test-subj="add-model-button" onClick={() => onAdd('ep-2')} type="button">
      Add
    </button>
  ),
}));

const mockUseQueryInferenceEndpoints = useQueryInferenceEndpoints as jest.Mock;
const mockUseRegisteredFeatures = useRegisteredFeatures as jest.Mock;

const mockEndpoints = [
  {
    inference_id: 'ep-1',
    service: 'elastic',
    task_type: 'chat_completion',
    service_settings: { model_id: 'claude' },
  },
  {
    inference_id: 'ep-2',
    service: 'elastic',
    task_type: 'chat_completion',
    service_settings: { model_id: 'claude' },
  },
  {
    inference_id: 'ep-3',
    service: 'openai',
    task_type: 'chat_completion',
    service_settings: { model_id: 'gpt-4o' },
  },
  {
    inference_id: 'ep-4',
    service: 'openai',
    task_type: 'chat_completion',
    service_settings: { model_id: 'gpt-4o-mini' },
  },
  {
    inference_id: 'ep-5',
    service: 'openai',
    task_type: 'chat_completion',
    service_settings: { model_id: 'gpt-3.5-turbo' },
  },
  {
    inference_id: 'ep-6',
    service: 'openai',
    task_type: 'chat_completion',
    service_settings: { model_id: 'o1' },
  },
  {
    inference_id: 'ep-embed',
    service: 'elastic',
    task_type: 'text_embedding',
    service_settings: { model_id: 'e5' },
  },
  {
    inference_id: 'ep-beta-tech-preview',
    service: 'elastic',
    task_type: 'chat_completion',
    service_settings: { model_id: 'claude' },
  },
];

const feature: InferenceFeatureConfig = {
  featureId: 'test_feature',
  parentFeatureId: 'parent',
  featureName: 'Test Feature',
  featureDescription: 'A test feature',
  taskType: 'chat_completion',
  recommendedEndpoints: ['ep-1'],
  isBeta: false,
  isTechPreview: false,
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <EuiThemeProvider>
        <I18nProvider>{children}</I18nProvider>
      </EuiThemeProvider>
    </QueryClientProvider>
  );
};

describe('SubFeatureCard', () => {
  const onEndpointsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryInferenceEndpoints.mockReturnValue({ data: mockEndpoints });
    mockUseRegisteredFeatures.mockReturnValue({ features: [], isLoading: false });
  });

  const renderCard = (endpointIds: string[], overrides?: Partial<InferenceFeatureConfig>) =>
    render(
      <Wrapper>
        <SubFeatureCard
          featureId={feature.featureId}
          feature={{ ...feature, ...overrides }}
          endpointIds={endpointIds}
          onEndpointsChange={onEndpointsChange}
        />
      </Wrapper>
    );

  it('renders feature name, description, and task type badge', () => {
    renderCard(['ep-1']);

    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    expect(screen.getByText('A test feature')).toBeInTheDocument();
    expect(screen.getByText('chat_completion')).toBeInTheDocument();
  });

  describe('feature status badges', () => {
    it.each([
      {
        scenario: 'renders beta',
        setup: {
          ids: ['ep-beta-technical-preview'],
          overrides: { isBeta: true },
        },
        expected: ['Beta'],
      },
      {
        scenario: 'renders technical preview',
        setup: {
          ids: ['ep-beta-technical-preview'],
          overrides: { isTechPreview: true },
        },
        expected: ['Technical Preview'],
      },
      {
        scenario: 'renders both beta and technical preview',
        setup: {
          ids: ['ep-beta-technical-preview'],
          overrides: { isBeta: true, isTechPreview: true },
        },
        expected: ['Beta', 'Technical Preview'],
      },
    ])('$scenario', ({ setup, expected }) => {
      const { ids, overrides } = setup;

      renderCard(ids, overrides);
      expected.forEach((text) => expect(screen.getByText(text)).toBeInTheDocument());
    });
  });

  it('renders all endpoint rows within collapsed count', () => {
    renderCard(['ep-1', 'ep-2']);

    expect(screen.getByTestId('endpoint-row-ep-1')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-row-ep-2')).toBeInTheDocument();
  });

  it('hides endpoints beyond collapsed count', () => {
    renderCard(['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6']);

    expect(screen.getByTestId('endpoint-row-ep-5')).toBeInTheDocument();
    expect(screen.queryByTestId('endpoint-row-ep-6')).not.toBeInTheDocument();
  });

  it('renders all endpoint rows when expanded', () => {
    renderCard(['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6']);

    fireEvent.click(screen.getByTestId('show-more-test_feature'));

    expect(screen.getByTestId('endpoint-row-ep-1')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-row-ep-6')).toBeInTheDocument();
  });

  it('shows Default badge only on the first endpoint', () => {
    renderCard(['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6']);

    fireEvent.click(screen.getByTestId('show-more-test_feature'));

    const badges = screen.getAllByText('Default');
    expect(badges).toHaveLength(1);
  });

  it('disables remove button when only one endpoint', () => {
    renderCard(['ep-1']);

    expect(screen.getByTestId('remove-endpoint-ep-1')).toBeDisabled();
  });

  it('shows remove buttons when multiple endpoints', () => {
    renderCard(['ep-1', 'ep-2']);

    expect(screen.getByTestId('remove-endpoint-ep-1')).toBeInTheDocument();
    expect(screen.getByTestId('remove-endpoint-ep-2')).toBeInTheDocument();
  });

  it('shows "Show N more" when endpoints exceed collapsed count', () => {
    renderCard(['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6']);

    expect(screen.getByTestId('show-more-test_feature')).toBeInTheDocument();
    expect(screen.queryByTestId('endpoint-row-ep-6')).not.toBeInTheDocument();
  });

  it('expands to show all endpoints on "Show more" click', () => {
    renderCard(['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6']);

    fireEvent.click(screen.getByTestId('show-more-test_feature'));

    expect(screen.getByTestId('endpoint-row-ep-6')).toBeInTheDocument();
    expect(screen.queryByTestId('show-more-test_feature')).not.toBeInTheDocument();
  });

  it('hides add-model button when collapsed', () => {
    renderCard(['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6']);

    expect(screen.queryByTestId('add-model-button')).not.toBeInTheDocument();
  });

  it('shows add-model button when not collapsed and under max', () => {
    renderCard(['ep-1'], { maxNumberOfEndpoints: 3 });

    expect(screen.getByTestId('add-model-button')).toBeInTheDocument();
  });

  it('hides add-model button when maxNumberOfEndpoints reached', () => {
    renderCard(['ep-1'], { maxNumberOfEndpoints: 1 });

    expect(screen.queryByTestId('add-model-button')).not.toBeInTheDocument();
  });

  it('adds endpoint via popover when add button clicked', () => {
    renderCard(['ep-1']);

    fireEvent.click(screen.getByTestId('add-model-button'));

    expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-1', 'ep-2']);
  });
});
