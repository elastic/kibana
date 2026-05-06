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
import { NO_DEFAULT_MODEL } from '../../../common/constants';

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

  const defaultGlobalRowProps = {
    hasSavedObject: true,
    isFeatureDirty: false,
    globalDefaultId: NO_DEFAULT_MODEL,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnectors.mockReturnValue({ data: mockConnectors });
    mockUseRegisteredFeatures.mockReturnValue({ features: [], isLoading: false });
  });

  // Default: customized list (toggle OFF) — covers the editable-mode tests below.
  const renderCard = (
    endpointIds: string[],
    overrides?: Partial<InferenceFeatureConfig>,
    invalidEndpointIds: Set<string> = new Set(),
    effectiveRecommendedEndpoints: string[] = ['__different__'],
    globalRowOverrides?: Partial<{
      hasSavedObject: boolean;
      isFeatureDirty: boolean;
      globalDefaultId: string;
    }>
  ) =>
    render(
      <Wrapper>
        <SubFeatureCard
          featureId={feature.featureId}
          feature={{ ...feature, ...overrides }}
          endpointIds={endpointIds}
          effectiveRecommendedEndpoints={effectiveRecommendedEndpoints}
          onEndpointsChange={onEndpointsChange}
          invalidEndpointIds={invalidEndpointIds}
          {...defaultGlobalRowProps}
          {...globalRowOverrides}
        />
      </Wrapper>
    );

  it('renders feature name, description, and Use recommended defaults toggle', () => {
    renderCard(['ep-1']);

    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    expect(screen.getByText('A test feature')).toBeInTheDocument();
    expect(screen.getByTestId('useRecommendedDefaultsToggle-test_feature')).toBeInTheDocument();
  });

  describe('feature status badges', () => {
    it.each([
      {
        scenario: 'renders beta',
        setup: { ids: ['ep-1'], overrides: { isBeta: true } },
        expected: ['Beta'],
      },
      {
        scenario: 'renders technical preview',
        setup: { ids: ['ep-1'], overrides: { isTechPreview: true } },
        expected: ['Technical Preview'],
      },
      {
        scenario: 'renders both beta and technical preview',
        setup: { ids: ['ep-1'], overrides: { isBeta: true, isTechPreview: true } },
        expected: ['Beta', 'Technical Preview'],
      },
    ])('$scenario', ({ setup, expected }) => {
      const { ids, overrides } = setup;
      renderCard(ids, overrides);
      expected.forEach((text) => expect(screen.getByText(text)).toBeInTheDocument());
    });
  });

  describe('Use recommended defaults toggle', () => {
    it('is checked when endpointIds equals effective recommended endpoints', () => {
      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={['ep-1']}
            effectiveRecommendedEndpoints={['ep-1']}
            onEndpointsChange={onEndpointsChange}
            invalidEndpointIds={new Set()}
            {...defaultGlobalRowProps}
          />
        </Wrapper>
      );

      const toggle = screen.getByTestId('useRecommendedDefaultsToggle-test_feature');
      expect(toggle).toBeChecked();
      // Locked mode renders the recommended endpoint as a read-only row...
      expect(screen.getByTestId('endpoint-row-ep-1')).toBeInTheDocument();
      // ...with no edit controls.
      expect(screen.queryByTestId('add-model-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('remove-endpoint-ep-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('copy-to-test_feature')).not.toBeInTheDocument();
    });

    it('is unchecked when endpointIds differ from recommended', () => {
      renderCard(['ep-2']);

      const toggle = screen.getByTestId('useRecommendedDefaultsToggle-test_feature');
      expect(toggle).not.toBeChecked();
    });

    it('opens the disable modal when toggling ON to OFF', () => {
      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={['ep-1']}
            effectiveRecommendedEndpoints={['ep-1']}
            onEndpointsChange={onEndpointsChange}
            invalidEndpointIds={new Set()}
            {...defaultGlobalRowProps}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('useRecommendedDefaultsToggle-test_feature'));
      expect(screen.getByTestId('disableRecommendedModelsModal')).toBeInTheDocument();
      expect(onEndpointsChange).not.toHaveBeenCalled();
    });

    it('confirming the disable modal switches the card into custom mode and unlocks the list', () => {
      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={['ep-1']}
            effectiveRecommendedEndpoints={['ep-1']}
            onEndpointsChange={onEndpointsChange}
            invalidEndpointIds={new Set()}
            {...defaultGlobalRowProps}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('useRecommendedDefaultsToggle-test_feature'));
      fireEvent.click(screen.getByText('Turn off recommended defaults'));

      // Seeds the editable list with the recommended endpoints.
      expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-1']);
      // Toggle is now off so the editable controls render.
      expect(screen.getByTestId('useRecommendedDefaultsToggle-test_feature')).not.toBeChecked();
      expect(screen.getByTestId('add-model-button')).toBeInTheDocument();
    });

    it('opens the reset modal when toggling OFF to ON', () => {
      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={['ep-2', 'ep-3']}
            effectiveRecommendedEndpoints={['ep-1']}
            onEndpointsChange={onEndpointsChange}
            invalidEndpointIds={new Set()}
            {...defaultGlobalRowProps}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('useRecommendedDefaultsToggle-test_feature'));
      expect(screen.getByTestId('resetDefaultsModal')).toBeInTheDocument();
      expect(onEndpointsChange).not.toHaveBeenCalled();
    });

    it('confirming the reset modal restores recommended endpoints', () => {
      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={['ep-2', 'ep-3']}
            effectiveRecommendedEndpoints={['ep-1']}
            onEndpointsChange={onEndpointsChange}
            invalidEndpointIds={new Set()}
            {...defaultGlobalRowProps}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('useRecommendedDefaultsToggle-test_feature'));
      fireEvent.click(screen.getByText('Reset to default'));

      expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-1']);
    });

    it('shows a focusable warning indicator for an invalid endpoint in the read-only recommended-defaults list', () => {
      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={['ep-1']}
            effectiveRecommendedEndpoints={['ep-1']}
            onEndpointsChange={onEndpointsChange}
            invalidEndpointIds={new Set(['ep-1'])}
            {...defaultGlobalRowProps}
          />
        </Wrapper>
      );

      const row = screen.getByTestId('endpoint-row-ep-1');
      expect(row).toBeInTheDocument();
      // EuiIconTip renders its inner icon with tabIndex={0}; the normal aria-hidden icon has none.
      expect(row.querySelector('[tabindex="0"]')).not.toBeNull();
    });
  });

  describe('Copy to control', () => {
    it('renders visible Copy to beside add model when other sub-features exist and the toggle is OFF', () => {
      mockUseRegisteredFeatures.mockReturnValue({
        features: [
          { ...feature },
          {
            ...feature,
            featureId: 'sibling',
            featureName: 'Sibling',
          },
        ],
        isLoading: false,
      });

      renderCard(['ep-2']);

      expect(screen.getByTestId('copy-to-test_feature')).toBeInTheDocument();
    });

    it('does not render in the locked recommended-defaults mode', () => {
      mockUseRegisteredFeatures.mockReturnValue({
        features: [{ ...feature }, { ...feature, featureId: 'sibling', featureName: 'Sibling' }],
        isLoading: false,
      });

      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={['ep-1']}
            effectiveRecommendedEndpoints={['ep-1']}
            onEndpointsChange={onEndpointsChange}
            invalidEndpointIds={new Set()}
            {...defaultGlobalRowProps}
          />
        </Wrapper>
      );

      expect(screen.queryByTestId('copy-to-test_feature')).not.toBeInTheDocument();
    });
  });

  describe('Global default row', () => {
    it('renders locked global default row and badge in custom mode when no saved object and global model is set', () => {
      renderCard(['ep-1', 'ep-2'], undefined, new Set(), ['__different__'], {
        hasSavedObject: false,
        isFeatureDirty: false,
        globalDefaultId: 'ep-3',
      });

      expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
      expect(screen.getByTestId('global-default-badge-test_feature')).toBeInTheDocument();
      expect(screen.getByText('Global default')).toBeInTheDocument();
    });

    it('hides the Global default badge when the feature is dirty but keeps the subdued row', () => {
      renderCard(['ep-1', 'ep-2'], undefined, new Set(), ['__different__'], {
        hasSavedObject: false,
        isFeatureDirty: true,
        globalDefaultId: 'ep-3',
      });

      expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
      expect(screen.queryByTestId('global-default-badge-test_feature')).not.toBeInTheDocument();
    });

    it('does not render the global default row when the feature has saved settings', () => {
      renderCard(['ep-1', 'ep-2'], undefined, new Set(), ['__different__'], {
        hasSavedObject: true,
        isFeatureDirty: false,
        globalDefaultId: 'ep-3',
      });

      expect(screen.queryByTestId('global-default-row-test_feature')).not.toBeInTheDocument();
    });

    it('renders the global default row in recommended-defaults mode when applicable', () => {
      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={['ep-1']}
            effectiveRecommendedEndpoints={['ep-1']}
            onEndpointsChange={onEndpointsChange}
            invalidEndpointIds={new Set()}
            hasSavedObject={false}
            isFeatureDirty={false}
            globalDefaultId="ep-3"
          />
        </Wrapper>
      );

      expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
    });

    it('suppresses the Default badge on the first draggable when the global default row is shown', () => {
      renderCard(['ep-1', 'ep-2'], undefined, new Set(), ['__different__'], {
        hasSavedObject: false,
        isFeatureDirty: false,
        globalDefaultId: 'ep-3',
      });

      expect(screen.queryByText('Default')).not.toBeInTheDocument();
    });
  });

  describe('editable mode endpoint list', () => {
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

    it('clicking remove calls onEndpointsChange without the removed endpoint', () => {
      renderCard(['ep-1', 'ep-2']);

      fireEvent.click(screen.getByTestId('remove-endpoint-ep-1'));

      expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-2']);
    });

    it('shows a warning indicator for an invalid endpoint in editable mode', () => {
      renderCard(['ep-1'], undefined, new Set(['ep-1']));

      // In JSDOM, EuiIcon renders the aria-label as text content, so the warning message
      // is queryable as visible text.
      expect(
        screen.getByText('Inference endpoint Claude is no longer available')
      ).toBeInTheDocument();
    });
  });
});
