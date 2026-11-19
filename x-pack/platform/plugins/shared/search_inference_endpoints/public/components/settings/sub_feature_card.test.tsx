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
import { useSupportedEffortLevels } from '../../hooks/use_supported_effort_levels';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';
import { NO_DEFAULT_MODEL } from '../../../common/constants';
import { EisModelStatus, type EndpointDeprecationInfo } from '../../types';

jest.mock('../../hooks/use_connectors');
jest.mock('../../hooks/use_registered_features');
jest.mock('../../hooks/use_supported_effort_levels');
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
jest.mock('./copy_to_modal', () => ({
  CopyToModal: ({ onApply }: { onApply: (selectedFeatureIds: string[]) => void }) => (
    <button data-test-subj="copy-to-apply" onClick={() => onApply(['sibling'])} type="button">
      Apply
    </button>
  ),
}));
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiDragDropContext: ({
      onDragEnd,
      children,
    }: {
      onDragEnd: (result: {
        source: { index: number };
        destination: { index: number } | null;
      }) => void;
      children: React.ReactNode;
    }) => (
      <actual.EuiDragDropContext onDragEnd={onDragEnd}>
        {children}
        <button
          data-test-subj="drag-first-to-second"
          onClick={() => onDragEnd({ source: { index: 0 }, destination: { index: 1 } })}
          type="button"
        >
          Drag
        </button>
      </actual.EuiDragDropContext>
    ),
  };
});

const mockUseConnectors = useConnectors as jest.Mock;
const mockUseRegisteredFeatures = useRegisteredFeatures as jest.Mock;
const mockUseSupportedEffortLevels = useSupportedEffortLevels as jest.Mock;

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
    mockUseSupportedEffortLevels.mockReturnValue(new Map());
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
    }>,
    deprecatedEndpointsMap: Map<string, EndpointDeprecationInfo> = new Map()
  ) =>
    render(
      <Wrapper>
        <SubFeatureCard
          featureId={feature.featureId}
          feature={{ ...feature, ...overrides }}
          endpointIds={endpointIds}
          effectiveRecommendedEndpoints={effectiveRecommendedEndpoints}
          onEndpointsChange={onEndpointsChange}
          efforts={{}}
          effectiveRecommendedEfforts={{}}
          onEffortsChange={jest.fn()}
          invalidEndpointIds={invalidEndpointIds}
          deprecatedEndpointsMap={deprecatedEndpointsMap}
          {...defaultGlobalRowProps}
          {...globalRowOverrides}
        />
      </Wrapper>
    );

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
            efforts={{}}
            effectiveRecommendedEfforts={{}}
            onEffortsChange={jest.fn()}
            invalidEndpointIds={new Set()}
            deprecatedEndpointsMap={new Map()}
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
            efforts={{}}
            effectiveRecommendedEfforts={{}}
            onEffortsChange={jest.fn()}
            invalidEndpointIds={new Set()}
            deprecatedEndpointsMap={new Map()}
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
            efforts={{}}
            effectiveRecommendedEfforts={{}}
            onEffortsChange={jest.fn()}
            invalidEndpointIds={new Set()}
            deprecatedEndpointsMap={new Map()}
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

    it('leaves custom mode when the page discards unsaved changes', () => {
      const cardProps = {
        featureId: feature.featureId,
        feature,
        endpointIds: ['ep-1'],
        effectiveRecommendedEndpoints: ['ep-1'],
        onEndpointsChange,
        efforts: {},
        effectiveRecommendedEfforts: {},
        onEffortsChange: jest.fn(),
        invalidEndpointIds: new Set<string>(),
        deprecatedEndpointsMap: new Map(),
        ...defaultGlobalRowProps,
      };
      const { rerender } = render(
        <Wrapper>
          <SubFeatureCard {...cardProps} discardVersion={0} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('useRecommendedDefaultsToggle-test_feature'));
      fireEvent.click(screen.getByText('Turn off recommended defaults'));
      expect(screen.getByTestId('useRecommendedDefaultsToggle-test_feature')).not.toBeChecked();

      rerender(
        <Wrapper>
          <SubFeatureCard {...cardProps} discardVersion={1} />
        </Wrapper>
      );

      expect(screen.getByTestId('useRecommendedDefaultsToggle-test_feature')).toBeChecked();
      expect(screen.queryByTestId('add-model-button')).not.toBeInTheDocument();
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
            efforts={{}}
            effectiveRecommendedEfforts={{}}
            onEffortsChange={jest.fn()}
            invalidEndpointIds={new Set()}
            deprecatedEndpointsMap={new Map()}
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
            efforts={{}}
            effectiveRecommendedEfforts={{}}
            onEffortsChange={jest.fn()}
            invalidEndpointIds={new Set()}
            deprecatedEndpointsMap={new Map()}
            {...defaultGlobalRowProps}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('useRecommendedDefaultsToggle-test_feature'));
      fireEvent.click(screen.getByText('Reset to default'));

      expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-1']);
    });
  });

  describe('editable endpoint list', () => {
    const manyEndpointIds = ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6'];

    it('expands to show all endpoints on "Show more" click', () => {
      renderCard(manyEndpointIds);

      expect(screen.queryByTestId('endpoint-row-ep-6')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('show-more-test_feature'));

      expect(screen.getByTestId('endpoint-row-ep-6')).toBeInTheDocument();
      expect(screen.queryByTestId('show-more-test_feature')).not.toBeInTheDocument();
    });

    it('keeps the list expanded after switching to recommended defaults and back', () => {
      const cardProps = {
        featureId: feature.featureId,
        feature,
        endpointIds: manyEndpointIds,
        onEndpointsChange,
        efforts: {},
        effectiveRecommendedEfforts: {},
        onEffortsChange: jest.fn(),
        invalidEndpointIds: new Set<string>(),
        deprecatedEndpointsMap: new Map(),
        ...defaultGlobalRowProps,
      };
      const { rerender } = render(
        <Wrapper>
          <SubFeatureCard {...cardProps} effectiveRecommendedEndpoints={['__different__']} />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('show-more-test_feature'));

      rerender(
        <Wrapper>
          <SubFeatureCard {...cardProps} effectiveRecommendedEndpoints={manyEndpointIds} />
        </Wrapper>
      );
      expect(screen.getByTestId('useRecommendedDefaultsToggle-test_feature')).toBeChecked();

      rerender(
        <Wrapper>
          <SubFeatureCard {...cardProps} effectiveRecommendedEndpoints={['__different__']} />
        </Wrapper>
      );

      expect(screen.getByTestId('endpoint-row-ep-6')).toBeInTheDocument();
      expect(screen.queryByTestId('show-more-test_feature')).not.toBeInTheDocument();
    });

    it('shows no global default row and no empty message when the global default id is empty', () => {
      renderCard([], undefined, new Set(), ['__different__'], {
        hasSavedObject: false,
        isFeatureDirty: false,
        globalDefaultId: '',
      });

      expect(screen.queryByTestId('global-default-row-test_feature')).not.toBeInTheDocument();
      expect(screen.queryByTestId('no-models-available-test_feature')).not.toBeInTheDocument();
    });

    it('labels rows with the connector name and flags invalid endpoints', () => {
      renderCard(['ep-1'], undefined, new Set(['ep-1']));

      expect(screen.getByTestId('endpoint-row-ep-1')).toHaveTextContent(
        'Inference endpoint Claude is no longer available'
      );
    });

    it('disables editing without manage permission', () => {
      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={['ep-2']}
            effectiveRecommendedEndpoints={['ep-1']}
            onEndpointsChange={onEndpointsChange}
            efforts={{}}
            effectiveRecommendedEfforts={{}}
            onEffortsChange={jest.fn()}
            invalidEndpointIds={new Set()}
            deprecatedEndpointsMap={new Map()}
            canManage={false}
            {...defaultGlobalRowProps}
          />
        </Wrapper>
      );

      expect(screen.getByTestId('useRecommendedDefaultsToggle-test_feature')).toBeDisabled();
      expect(screen.getByTestId('endpoint-row-ep-2')).toBeInTheDocument();
      expect(screen.queryByTestId('add-model-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('remove-endpoint-ep-2')).not.toBeInTheDocument();
    });
  });

  describe('Copy to control', () => {
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
            efforts={{}}
            effectiveRecommendedEfforts={{}}
            onEffortsChange={jest.fn()}
            invalidEndpointIds={new Set()}
            deprecatedEndpointsMap={new Map()}
            {...defaultGlobalRowProps}
          />
        </Wrapper>
      );

      expect(screen.queryByTestId('copy-to-test_feature')).not.toBeInTheDocument();
    });

    it('copies efforts with the models to other features', () => {
      const onEffortsChange = jest.fn();
      mockUseRegisteredFeatures.mockReturnValue({
        features: [feature, { ...feature, featureId: 'sibling', featureName: 'Sibling' }],
        isLoading: false,
      });
      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={['ep-1', 'ep-2']}
            effectiveRecommendedEndpoints={['__different__']}
            onEndpointsChange={onEndpointsChange}
            efforts={{ 'ep-1': 'high' }}
            effectiveRecommendedEfforts={{}}
            onEffortsChange={onEffortsChange}
            invalidEndpointIds={new Set()}
            deprecatedEndpointsMap={new Map()}
            {...defaultGlobalRowProps}
          />
        </Wrapper>
      );

      fireEvent.click(screen.getByTestId('copy-to-test_feature'));
      fireEvent.click(screen.getByTestId('copy-to-apply'));

      expect(onEndpointsChange).toHaveBeenCalledWith('sibling', ['ep-1', 'ep-2']);
      expect(onEffortsChange).toHaveBeenCalledWith('sibling', { 'ep-1': 'high' });
    });
  });

  describe('Global default row', () => {
    it('does not render the global default row while customizing the priority list', () => {
      renderCard(['ep-1', 'ep-2'], undefined, new Set(), ['__different__'], {
        hasSavedObject: false,
        isFeatureDirty: false,
        globalDefaultId: 'ep-3',
      });

      expect(screen.queryByTestId('global-default-row-test_feature')).not.toBeInTheDocument();
    });

    it('renders locked global default row and badge in custom mode when no models are assigned', () => {
      renderCard([], undefined, new Set(), ['__different__'], {
        hasSavedObject: false,
        isFeatureDirty: false,
        globalDefaultId: 'ep-3',
      });

      expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
      expect(screen.getByTestId('global-default-badge-test_feature')).toBeInTheDocument();
      expect(screen.getByText('Global default')).toBeInTheDocument();
      expect(screen.queryByTestId('no-models-available-test_feature')).not.toBeInTheDocument();
    });

    it('hides the Global default badge when the feature is dirty but keeps the subdued row', () => {
      renderCard([], undefined, new Set(), ['__different__'], {
        hasSavedObject: false,
        isFeatureDirty: true,
        globalDefaultId: 'ep-3',
      });

      expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
      expect(screen.queryByTestId('global-default-badge-test_feature')).not.toBeInTheDocument();
    });

    it('does not render the global default row when the feature has saved settings', () => {
      renderCard([], undefined, new Set(), ['__different__'], {
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
            efforts={{}}
            effectiveRecommendedEfforts={{}}
            onEffortsChange={jest.fn()}
            invalidEndpointIds={new Set()}
            deprecatedEndpointsMap={new Map()}
            hasSavedObject={false}
            isFeatureDirty={false}
            globalDefaultId="ep-3"
          />
        </Wrapper>
      );

      expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
    });

    it('renders the deprecated badge on the global default locked row', () => {
      const deprecatedInfo: EndpointDeprecationInfo = {
        name: 'Claude 2',
        status: EisModelStatus.Deprecated,
        metadata: {
          heuristics: { status: 'deprecated', end_of_life_date: '2099-01-01' },
        },
      };
      renderCard(
        [],
        undefined,
        new Set(),
        ['__different__'],
        { hasSavedObject: false, isFeatureDirty: false, globalDefaultId: 'ep-3' },
        new Map([['ep-3', deprecatedInfo]])
      );

      expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
      expect(screen.getByTestId('modelDeprecatedBadge-ep-3')).toBeInTheDocument();
    });
  });

  describe('ignoreGlobalDefault — globalDefaultId set to NO_DEFAULT_MODEL', () => {
    it('does not render the global default locked row when globalDefaultId is NO_DEFAULT_MODEL', () => {
      renderCard([], undefined, new Set(), ['__different__'], {
        hasSavedObject: false,
        globalDefaultId: NO_DEFAULT_MODEL,
      });

      expect(screen.queryByTestId('global-default-row-test_feature')).not.toBeInTheDocument();
    });
  });

  describe('region preferences', () => {
    const recommendedEndpointIds = ['ep-1', 'ep-2', 'ep-missing'];
    const regionDeniedConnectors = mockConnectors.map((connector) =>
      connector.connectorId === 'ep-2' || connector.connectorId === 'ep-3'
        ? { ...connector, metadata: { denied_by_region_policy: true } }
        : connector
    );

    const renderRecommendedCard = (globalDefaultId: string = NO_DEFAULT_MODEL) =>
      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={recommendedEndpointIds}
            effectiveRecommendedEndpoints={recommendedEndpointIds}
            onEndpointsChange={onEndpointsChange}
            efforts={{}}
            effectiveRecommendedEfforts={{}}
            onEffortsChange={jest.fn()}
            invalidEndpointIds={new Set()}
            deprecatedEndpointsMap={new Map()}
            hasSavedObject={false}
            isFeatureDirty={false}
            globalDefaultId={globalDefaultId}
          />
        </Wrapper>
      );

    beforeEach(() => {
      mockUseConnectors.mockReturnValue({ data: regionDeniedConnectors });
    });

    it('hides recommended models that are denied by region policy and keeps the rest', () => {
      renderRecommendedCard();

      expect(screen.getByTestId('endpoint-row-ep-1')).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-row-ep-missing')).toBeInTheDocument();
      expect(screen.queryByTestId('endpoint-row-ep-2')).not.toBeInTheDocument();
    });

    it('hides the global default row when the global model is denied by region policy', () => {
      renderRecommendedCard('ep-3');

      expect(screen.queryByTestId('global-default-row-test_feature')).not.toBeInTheDocument();
    });

    it('shows the global default row when the global model is allowed by region policy', () => {
      renderRecommendedCard('ep-4');

      expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
    });

    it('seeds the editable list without denied models when turning off recommended defaults', () => {
      renderRecommendedCard();

      fireEvent.click(screen.getByTestId('useRecommendedDefaultsToggle-test_feature'));
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-1', 'ep-missing']);
    });

    describe('when editing a list that has denied models assigned', () => {
      beforeEach(() => {
        mockUseConnectors.mockReturnValue({
          data: mockConnectors.map((connector) =>
            connector.connectorId === 'ep-3'
              ? { ...connector, metadata: { denied_by_region_policy: true } }
              : connector
          ),
        });
      });

      it('drops denied models when removing a visible model', () => {
        renderCard(['ep-1', 'ep-3', 'ep-4']);

        fireEvent.click(screen.getByTestId('remove-endpoint-ep-1'));

        expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-4']);
      });

      it('drops denied models when adding a model', () => {
        renderCard(['ep-1', 'ep-3']);

        fireEvent.click(screen.getByTestId('add-model-button'));

        expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-1', 'ep-2']);
      });

      it('drops denied models when adding a model while every assigned model is denied', () => {
        renderCard(['ep-3']);

        expect(screen.getByTestId('no-models-available-test_feature')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('add-model-button'));

        expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-2']);
      });

      it('drops denied models when reordering visible models', () => {
        renderCard(['ep-1', 'ep-3', 'ep-4']);

        fireEvent.click(screen.getByTestId('drag-first-to-second'));

        expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-4', 'ep-1']);
      });

      it('copies only visible models to other features', () => {
        mockUseRegisteredFeatures.mockReturnValue({
          features: [feature, { ...feature, featureId: 'sibling', featureName: 'Sibling' }],
          isLoading: false,
        });
        renderCard(['ep-1', 'ep-3']);

        fireEvent.click(screen.getByTestId('copy-to-test_feature'));
        fireEvent.click(screen.getByTestId('copy-to-apply'));

        expect(onEndpointsChange).toHaveBeenCalledWith('sibling', ['ep-1']);
      });

      it('counts only visible models toward maxNumberOfEndpoints', () => {
        renderCard(['ep-1', 'ep-3'], { maxNumberOfEndpoints: 2 });

        expect(screen.getByTestId('add-model-button')).toBeInTheDocument();
      });

      it('disables removing the last visible model', () => {
        renderCard(['ep-1', 'ep-3']);

        expect(screen.getByTestId('remove-endpoint-ep-1')).toBeDisabled();
      });
    });

    it('turns off and disables recommended defaults when every recommended model is denied by region policy', () => {
      mockUseRegisteredFeatures.mockReturnValue({
        features: [feature, { ...feature, featureId: 'sibling', featureName: 'Sibling' }],
        isLoading: false,
      });
      const deniedRecommendedEndpointIds = ['ep-2', 'ep-3'];
      render(
        <Wrapper>
          <SubFeatureCard
            featureId={feature.featureId}
            feature={feature}
            endpointIds={deniedRecommendedEndpointIds}
            effectiveRecommendedEndpoints={deniedRecommendedEndpointIds}
            onEndpointsChange={onEndpointsChange}
            efforts={{}}
            effectiveRecommendedEfforts={{}}
            onEffortsChange={jest.fn()}
            invalidEndpointIds={new Set()}
            deprecatedEndpointsMap={new Map()}
            hasSavedObject={false}
            isFeatureDirty={false}
            globalDefaultId={NO_DEFAULT_MODEL}
          />
        </Wrapper>
      );

      const toggle = screen.getByTestId('useRecommendedDefaultsToggle-test_feature');
      expect(toggle).not.toBeChecked();
      expect(toggle).toBeDisabled();
      expect(screen.getByTestId('add-model-button')).toBeInTheDocument();
      expect(screen.getByTestId('copy-to-test_feature')).toBeDisabled();
      expect(screen.getByTestId('no-models-available-test_feature')).toHaveTextContent(
        'No models available'
      );
      expect(screen.queryByTestId('endpoint-row-ep-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('endpoint-row-ep-3')).not.toBeInTheDocument();
    });
  });
});
