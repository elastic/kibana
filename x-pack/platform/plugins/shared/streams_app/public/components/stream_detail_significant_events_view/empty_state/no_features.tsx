/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AssetImage } from '../../asset_image';
import { useAIFeatures } from '../add_significant_event_flyout/generated_flow_form/use_ai_features';

export function NoFeaturesEmptyState({
  onFeatureIdentificationClick,
  onManualEntryClick,
}: {
  onFeatureIdentificationClick: () => void;
  onManualEntryClick: () => void;
}) {
  const aiFeatures = useAIFeatures();

  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiSpacer size="m" />
      <AssetImage type="checklist" size="m" />
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.streams.significantEvents.noFeatures.title', {
            defaultMessage: 'Stream features missing',
          })}
        </h2>
      </EuiTitle>
      <EuiText size="s" textAlign="center" css={{ maxWidth: 480 }}>
        {i18n.translate('xpack.streams.significantEvents.noFeatures.description', {
          defaultMessage:
            'Feature identification generates logical subsets of the data in that stream. This is useful for generating better significant events.',
        })}
      </EuiText>
      <EuiFlexGroup direction="row" gutterSize="s">
        <EuiButton
          iconType="sparkles"
          fill
          onClick={onFeatureIdentificationClick}
          disabled={!aiFeatures?.genAiConnectors?.selectedConnector}
        >
          {i18n.translate(
            'xpack.streams.significantEvents.noFeatures.featureIdentificationButtonLabel',
            {
              defaultMessage: 'Identify features',
            }
          )}
        </EuiButton>
        <EuiButtonEmpty onClick={onManualEntryClick}>
          {i18n.translate('xpack.streams.significantEvents.noFeatures.manualEntryButtonLabel', {
            defaultMessage: 'Manual entry',
          })}
        </EuiButtonEmpty>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
