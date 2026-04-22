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
import { InferenceConnectorType } from '@kbn/inference-common';
import type { InferenceConnector } from '@kbn/inference-common';
import { SubFeatureCard } from './sub_feature_card';
import { useConnectors } from '../../hooks/use_connectors';
import { useRegisteredFeatures } from '../../hooks/use_registered_features';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';

jest.mock('../../hooks/use_connectors');
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

const mockUseConnectors = useConnectors as jest.Mock;
const mockUseRegisteredFeatures = useRegisteredFeatures as jest.Mock;

const mockConnectors: InferenceConnector[] = [
  {
    connectorId: 'ep-1',
    name: 'Claude',
    type: InferenceConnectorType.Inference,
    config: { service: 'elastic', modelCreator: 'Anthropic' },
    capabilities: {},
    isInferenceEndpoint: true,
    isPreconfigured: true,
  },
  {
    connectorId: 'ep-2',
    name: 'Claude 2',
    type: InferenceConnectorType.Inference,
    config: { service: 'elastic', modelCreator: 'Anthropic' },
    capabilities: {},
    isInferenceEndpoint: true,
    isPreconfigured: true,
  },
  {
    connectorId: 'ep-3',
    name: 'GPT-4o',
    type: InferenceConnectorType.OpenAI,
    config: {},
    capabilities: {},
    isInferenceEndpoint: false,
    isPreconfigured: false,
  },
  {
    connectorId: 'ep-4',
    name: 'GPT-4o-mini',
    type: InferenceConnectorType.OpenAI,
    config: {},
    capabilities: {},
    isInferenceEndpoint: false,
    isPreconfigured: false,
  },
  {
    connectorId: 'ep-5',
    name: 'GPT-3.5-turbo',
    type: InferenceConnectorType.OpenAI,
    config: {},
    capabilities: {},
    isInferenceEndpoint: false,
    isPreconfigured: false,
  },
  {
    connectorId: 'ep-6',
    name: 'o1',
    type: InferenceConnectorType.OpenAI,
    config: {},
    capabilities: {},
    isInferenceEndpoint: false,
    isPreconfigured: false,
  },
  {
    connectorId: 'ep-embed',
    name: 'E5',
    type: InferenceConnectorType.Inference,
    config: { service: 'elastic' },
    capabilities: {},
    isInferenceEndpoint: true,
    isPreconfigured: true,
  },
  {
    connectorId: 'ep-beta-tech-preview',
    name: 'Claude Beta',
    type: InferenceConnectorType.Inference,
    config: { service: 'elastic', modelCreator: 'Anthropic' },
    capabilities: {},
    isInferenceEndpoint: true,
    isPreconfigured: true,
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
    mockUseConnectors.mockReturnValue({ data: mockConnectors });
    mockUseRegisteredFeatures.mockReturnValue({ features: [], isLoading: false });
  });

  const renderCard = (
    endpointIds: string[],
    overrides?: Partial<InferenceFeatureConfig>,
    extra?: {
      invalidEndpointIds?: Set<string>;
      globalDefaultId?: string;
      hasSavedObject?: boolean;
      isFeatureDirty?: boolean;
    }
  ) =>
    render(
      <Wrapper>
        <SubFeatureCard
          featureId={feature.featureId}
          feature={{ ...feature, ...overrides }}
          endpointIds={endpointIds}
          onEndpointsChange={onEndpointsChange}
          invalidEndpointIds={extra?.invalidEndpointIds ?? new Set()}
          globalDefaultId={extra?.globalDefaultId ?? 'NO_DEFAULT_MODEL'}
          hasSavedObject={extra?.hasSavedObject ?? true}
          isFeatureDirty={extra?.isFeatureDirty ?? false}
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

  describe('connector icon mapping', () => {
    it('renders connector name as endpoint label', () => {
      mockUseConnectors.mockReturnValue({
        data: [
          {
            connectorId: 'bedrock-1',
            name: 'My Bedrock Model',
            type: InferenceConnectorType.Bedrock,
            config: {},
            capabilities: {},
            isInferenceEndpoint: false,
            isPreconfigured: false,
          },
        ],
      });

      renderCard(['bedrock-1']);

      expect(screen.getByText('My Bedrock Model')).toBeInTheDocument();
    });

    it('falls back to endpoint ID when connector is not in the map', () => {
      mockUseConnectors.mockReturnValue({ data: [] });

      renderCard(['unknown-ep']);

      expect(screen.getByText('unknown-ep')).toBeInTheDocument();
    });

    it('renders Azure OpenAI icon for OpenAI connectors with Azure provider', () => {
      mockUseConnectors.mockReturnValue({
        data: [
          {
            connectorId: 'azure-1',
            name: 'Azure GPT',
            type: InferenceConnectorType.OpenAI,
            config: { apiProvider: 'Azure OpenAI' },
            capabilities: {},
            isInferenceEndpoint: false,
            isPreconfigured: false,
          },
        ],
      });

      renderCard(['azure-1']);

      expect(screen.getByText('Azure GPT')).toBeInTheDocument();
    });
  });

  describe('global default row', () => {
    it('does not render greyed row when feature has a saved object', () => {
      renderCard(['ep-1'], undefined, {
        globalDefaultId: 'ep-3',
        hasSavedObject: true,
        isFeatureDirty: false,
      });

      expect(screen.queryByTestId('global-default-row-test_feature')).not.toBeInTheDocument();
    });

    it('does not render greyed row when global default is unset', () => {
      renderCard(['ep-1'], undefined, {
        globalDefaultId: 'NO_DEFAULT_MODEL',
        hasSavedObject: false,
        isFeatureDirty: false,
      });

      expect(screen.queryByTestId('global-default-row-test_feature')).not.toBeInTheDocument();
    });

    it('renders greyed row with badge when no saved object, default set, and not dirty', () => {
      renderCard(['ep-1'], undefined, {
        globalDefaultId: 'ep-3',
        hasSavedObject: false,
        isFeatureDirty: false,
      });

      expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
      expect(screen.getByTestId('global-default-badge-test_feature')).toBeInTheDocument();
    });

    it('renders greyed row without badge when feature has been edited', () => {
      renderCard(['ep-1'], undefined, {
        globalDefaultId: 'ep-3',
        hasSavedObject: false,
        isFeatureDirty: true,
      });

      expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
      expect(screen.queryByTestId('global-default-badge-test_feature')).not.toBeInTheDocument();
    });

    it('hides the per-endpoint Default badge when the global default row is shown', () => {
      renderCard(['ep-1', 'ep-2'], undefined, {
        globalDefaultId: 'ep-3',
        hasSavedObject: false,
        isFeatureDirty: false,
      });

      expect(screen.queryByText('Default')).not.toBeInTheDocument();
    });
  });
});
