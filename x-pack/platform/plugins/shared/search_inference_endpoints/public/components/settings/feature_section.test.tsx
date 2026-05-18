/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { InferenceConnectorType } from '@kbn/inference-common';
import { FeatureSection } from './feature_section';
import { useConnectors } from '../../hooks/use_connectors';
import { useRegisteredFeatures } from '../../hooks/use_registered_features';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';

jest.mock('../../hooks/use_connectors');
jest.mock('../../hooks/use_registered_features');
jest.mock('./add_model_popover', () => ({
  AddModelPopover: () => <button type="button">Add</button>,
}));

const mockUseConnectors = useConnectors as jest.Mock;
const mockUseRegisteredFeatures = useRegisteredFeatures as jest.Mock;

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <EuiThemeProvider>{children}</EuiThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
};

const mockConnector = {
  connectorId: 'default-id',
  name: 'Claude Haiku',
  type: InferenceConnectorType.Inference,
  config: { service: 'elastic', modelCreator: 'Anthropic' },
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
};

const regularFeature: InferenceFeatureConfig = {
  featureId: 'regular_feature',
  parentFeatureId: 'parent',
  featureName: 'Regular Feature',
  featureDescription: 'Uses global default',
  taskType: 'chat_completion',
  recommendedEndpoints: ['default-id'],
};

const optOutFeature: InferenceFeatureConfig = {
  featureId: 'opt_out_feature',
  parentFeatureId: 'parent',
  featureName: 'Opt-out Feature',
  featureDescription: 'Ignores global default',
  taskType: 'chat_completion',
  recommendedEndpoints: ['default-id'],
  ignoreGlobalDefault: true,
};

const makeFeatureItem = (feature: InferenceFeatureConfig) => ({
  endpointIds: feature.recommendedEndpoints,
  effectiveRecommendedEndpoints: feature.recommendedEndpoints,
  feature,
  hasSavedObject: false,
  isFeatureDirty: false,
});

beforeEach(() => {
  mockUseConnectors.mockReturnValue({ data: [mockConnector], isLoading: false });
  mockUseRegisteredFeatures.mockReturnValue({ features: [], isLoading: false });
});

describe('FeatureSection — ignoreGlobalDefault per-child suppression', () => {
  it('shows the global default row for a regular feature when globalDefaultId is set', () => {
    render(
      <Wrapper>
        <FeatureSection
          parentName="Parent"
          parentDescription="desc"
          features={[makeFeatureItem(regularFeature)]}
          onEndpointsChange={jest.fn()}
          invalidEndpointIds={new Set()}
          deprecatedEndpointsMap={new Map()}
          globalDefaultId="default-id"
        />
      </Wrapper>
    );

    expect(screen.getByTestId('global-default-row-regular_feature')).toBeInTheDocument();
  });

  it('does not show the global default row for a feature with ignoreGlobalDefault: true even when globalDefaultId is set', () => {
    render(
      <Wrapper>
        <FeatureSection
          parentName="Parent"
          parentDescription="desc"
          features={[makeFeatureItem(optOutFeature)]}
          onEndpointsChange={jest.fn()}
          invalidEndpointIds={new Set()}
          deprecatedEndpointsMap={new Map()}
          globalDefaultId="default-id"
        />
      </Wrapper>
    );

    expect(screen.queryByTestId('global-default-row-opt_out_feature')).not.toBeInTheDocument();
  });

  it('handles mixed children — regular child shows row, opt-out child does not', () => {
    render(
      <Wrapper>
        <FeatureSection
          parentName="Parent"
          parentDescription="desc"
          features={[makeFeatureItem(regularFeature), makeFeatureItem(optOutFeature)]}
          onEndpointsChange={jest.fn()}
          invalidEndpointIds={new Set()}
          deprecatedEndpointsMap={new Map()}
          globalDefaultId="default-id"
        />
      </Wrapper>
    );

    expect(screen.getByTestId('global-default-row-regular_feature')).toBeInTheDocument();
    expect(screen.queryByTestId('global-default-row-opt_out_feature')).not.toBeInTheDocument();
  });
});
