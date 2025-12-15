/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AssetImage } from '../../asset_image';
import { FeaturesSelector, type FeatureSelectorProps } from '../feature_selector';
import { ConnectorListButton } from '../../connector_list_button/connector_list_button';

export function NoSignificantEventsEmptyState({
  onGenerateSuggestionsClick,
  onManualEntryClick,
  features,
  selectedFeatures,
  onFeaturesChange,
}: {
  onGenerateSuggestionsClick: () => void;
  onManualEntryClick: () => void;
} & FeatureSelectorProps) {
  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiSpacer size="m" />
      <AssetImage type="significantEventsEmptyState" size="m" />
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.streams.significantEvents.emptyState.title', {
            defaultMessage: 'Generate significant events',
          })}
        </h2>
      </EuiTitle>
      <EuiText size="s" textAlign="center" css={{ maxWidth: 480 }}>
        {i18n.translate('xpack.streams.significantEvents.emptyState.description', {
          defaultMessage:
            "A Significant Event is a single, ‘interesting’ log event identified by an automated rule as being important for understanding a system's behaviour. Select feature context, to generate suggestions.",
        })}
      </EuiText>
      <FeaturesSelector
        features={features}
        selectedFeatures={selectedFeatures}
        onFeaturesChange={onFeaturesChange}
      />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s">
          <ConnectorListButton
            buttonProps={{
              iconType: 'sparkles',
              isDisabled: selectedFeatures.length === 0,
              onClick: () => onGenerateSuggestionsClick(),
              'data-test-subj': 'significant_events_generate_suggestions_button',
              children: i18n.translate(
                'xpack.streams.significantEvents.emptyState.generateSuggestionsButtonLabel',
                {
                  defaultMessage: 'Generate suggestions',
                }
              ),
            }}
          />
          <EuiButtonEmpty
            onClick={onManualEntryClick}
            data-test-subj="significant_events_manual_entry_button"
          >
            {i18n.translate('xpack.streams.significantEvents.emptyState.manualEntryButtonLabel', {
              defaultMessage: 'Manual entry',
            })}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
