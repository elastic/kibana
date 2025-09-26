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
import { SystemSelector, type SystemSelectorProps } from '../system_selector';
import { useAIFeatures } from '../add_significant_event_flyout/generated_flow_form/use_ai_features';

export function NoSignificantEventsEmptyState({
  onGenerateSuggestionsClick,
  onManualEntryClick,
  systems,
  selectedSystems,
  onSystemsChange,
}: {
  onGenerateSuggestionsClick: () => void;
  onManualEntryClick: () => void;
} & SystemSelectorProps) {
  const aiFeatures = useAIFeatures();

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
            "A Significant Event is a single, ‘interesting’ log event identified by an automated rule as being important for understanding a system's behaviour. Select system context, to generate suggestions.",
        })}
      </EuiText>
      <SystemSelector
        systems={systems}
        selectedSystems={selectedSystems}
        onSystemsChange={onSystemsChange}
      />
      <EuiFlexGroup direction="row" gutterSize="s">
        <EuiButton
          iconType="sparkles"
          fill
          disabled={selectedSystems.length === 0 || !aiFeatures?.genAiConnectors?.selectedConnector}
          onClick={() => onGenerateSuggestionsClick()}
        >
          {i18n.translate(
            'xpack.streams.significantEvents.emptyState.generateSuggestionsButtonLabel',
            {
              defaultMessage: 'Generate suggestions',
            }
          )}
        </EuiButton>
        <EuiButtonEmpty onClick={onManualEntryClick}>
          {i18n.translate('xpack.streams.significantEvents.noSystems.manualEntryButtonLabel', {
            defaultMessage: 'Manual entry',
          })}
        </EuiButtonEmpty>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
