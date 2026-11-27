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
import { SubFeatureCardHeader } from './sub_feature_card_header';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';

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

describe('SubFeatureCardHeader', () => {
  const onToggleRecommendedDefaults = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderHeader = (
    overrides?: Partial<InferenceFeatureConfig>,
    { isFeatureDirty = false }: { isFeatureDirty?: boolean } = {}
  ) =>
    render(
      <EuiThemeProvider>
        <I18nProvider>
          <SubFeatureCardHeader
            featureId={feature.featureId}
            feature={{ ...feature, ...overrides }}
            isFeatureDirty={isFeatureDirty}
            isUsingRecommendedDefaults
            hasAvailableRecommendedEndpoints
            canManage
            onToggleRecommendedDefaults={onToggleRecommendedDefaults}
          />
        </I18nProvider>
      </EuiThemeProvider>
    );

  it('renders feature name, description, and Use recommended defaults toggle', () => {
    const { container } = renderHeader();

    expect(screen.getByTestId('subFeatureCardTitle-test_feature')).toHaveTextContent(
      'Test Feature'
    );
    expect(container).toHaveTextContent('A test feature');
    expect(screen.getByTestId('useRecommendedDefaultsToggle-test_feature')).toBeInTheDocument();
  });

  it('calls onToggleRecommendedDefaults when the toggle is clicked', () => {
    renderHeader();

    fireEvent.click(screen.getByTestId('useRecommendedDefaultsToggle-test_feature'));

    expect(onToggleRecommendedDefaults).toHaveBeenCalledWith(false);
  });

  it('marks the feature title as unsaved when the feature is dirty', () => {
    renderHeader(undefined, { isFeatureDirty: true });

    expect(
      screen.getByTestId(`subFeatureCardTitle-${feature.featureId}-unsaved`)
    ).toBeInTheDocument();
  });

  it('does not mark the feature title as unsaved when the feature is clean', () => {
    renderHeader();

    expect(
      screen.queryByTestId(`subFeatureCardTitle-${feature.featureId}-unsaved`)
    ).not.toBeInTheDocument();
  });

  describe('feature status badges', () => {
    it.each([
      {
        scenario: 'renders beta',
        overrides: { isBeta: true },
        expected: ['Beta'],
      },
      {
        scenario: 'renders technical preview',
        overrides: { isTechPreview: true },
        expected: ['Technical Preview'],
      },
      {
        scenario: 'renders both beta and technical preview',
        overrides: { isBeta: true, isTechPreview: true },
        expected: ['Beta', 'Technical Preview'],
      },
    ])('$scenario', ({ overrides, expected }) => {
      const { container } = renderHeader(overrides);
      expected.forEach((text) => expect(container).toHaveTextContent(text));
    });
  });
});
