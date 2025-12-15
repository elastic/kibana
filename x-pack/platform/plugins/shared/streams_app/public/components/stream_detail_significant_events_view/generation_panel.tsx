/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FeatureSelectorProps, FeaturesSelector } from './feature_selector';
import { AssetImage } from '../asset_image';
import { ConnectorListButton } from '../connector_list_button/connector_list_button';

export function SignificantEventsGenerationPanel({
  features,
  selectedFeatures,
  onFeaturesChange,
  onGenerateSuggestionsClick,
  onFeatureIdentificationClick,
  onManualEntryClick,
  isLoadingGeneration,
}: FeatureSelectorProps & {
  onFeatureIdentificationClick: () => void;
  onManualEntryClick?: () => void;
  onGenerateSuggestionsClick: () => void;
  isLoadingGeneration: boolean;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiPanel hasBorder css={{ 'text-align': 'left' }}>
          <EuiFlexGroup direction="row">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <b>
                  {i18n.translate(
                    'xpack.streams.significantEvents.significantEventsGenerationPanel.generationContextTitle',
                    {
                      defaultMessage: 'Generation context',
                    }
                  )}
                </b>
              </EuiTitle>

              <EuiSpacer size="s" />

              <EuiText size="s" color="subdued">
                {i18n.translate(
                  'xpack.streams.significantEvents.significantEventsGenerationPanel.description',
                  {
                    defaultMessage:
                      'Features are logical subsets of your data and they provide the best context for generation sigificant events generation.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <AssetImage type="checklist" size={100} />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiFlexItem>
            <FeaturesSelector
              features={features}
              selectedFeatures={selectedFeatures}
              onFeaturesChange={onFeaturesChange}
            />
          </EuiFlexItem>

          <EuiSpacer size="m" />

          <EuiFlexItem>
            <ConnectorListButton
              buttonProps={{
                iconType: 'sparkles',
                isLoading: isLoadingGeneration,
                onClick: () => onGenerateSuggestionsClick(),
                'data-test-subj': 'significant_events_generate_suggestions_button',
                children: i18n.translate(
                  'xpack.streams.significantEvents.significantEventsGenerationPanel.generateSuggestionsButtonLabel',
                  {
                    defaultMessage: 'Generate suggestions',
                  }
                ),
              }}
            />
          </EuiFlexItem>
        </EuiPanel>
      </EuiFlexItem>

      {!onManualEntryClick && features.length > 0 ? null : (
        <>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="m" css={{ width: '100%' }}>
              <EuiFlexItem>
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.translate(
                    'xpack.streams.significantEvents.significantEventsGenerationPanel.orStartWithLabel',
                    {
                      defaultMessage: 'or start with',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" justifyContent="spaceEvenly" gutterSize="s">
              {features.length === 0 && (
                <EuiFlexItem grow={false}>
                  <ConnectorListButton
                    buttonProps={{
                      iconType: 'sparkles',
                      onClick: onFeatureIdentificationClick,
                      isDisabled: isLoadingGeneration,
                      'data-test-subj': 'significant_events_identify_features_button',
                      children: i18n.translate(
                        'xpack.streams.significantEvents.significantEventsGenerationPanel.featureIdentificationButtonLabel',
                        {
                          defaultMessage: 'Identify features',
                        }
                      ),
                    }}
                  />
                </EuiFlexItem>
              )}

              {onManualEntryClick && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    color="text"
                    fill={false}
                    data-test-subj="significant_events_manual_entry_button"
                    onClick={onManualEntryClick}
                    iconType="plusInCircle"
                  >
                    {i18n.translate(
                      'xpack.streams.significantEvents.significantEventsGenerationPanel.manualEntryButtonLabel',
                      {
                        defaultMessage: 'Manual entry',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
}
