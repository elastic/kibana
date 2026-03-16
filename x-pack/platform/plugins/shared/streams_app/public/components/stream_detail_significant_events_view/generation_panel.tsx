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
import { AssetImage } from '../asset_image';
import { ConnectorListButtonBase } from '../connector_list_button/connector_list_button';
import type { Flow } from './add_significant_event_flyout/types';
import type { AIFeatures } from '../../hooks/use_ai_features';

export function SignificantEventsGenerationPanel({
  onGenerateSuggestionsClick,
  onManualEntryClick,
  isGeneratingQueries,
  isSavingManualEntry,
  selectedFlow,
  aiFeatures,
}: {
  onManualEntryClick: () => void;
  onGenerateSuggestionsClick: () => void;
  isGeneratingQueries: boolean;
  isSavingManualEntry: boolean;
  selectedFlow?: Flow;
  aiFeatures: AIFeatures | null;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiPanel hasBorder css={{ textAlign: 'left' }}>
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
                      'Use AI to generate significant events from the data in this stream. Generation uses the last 24 hours of data.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <AssetImage type="checklist" size={80} />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiFlexItem>
            <ConnectorListButtonBase
              buttonProps={{
                iconType: 'sparkles',
                isLoading: isGeneratingQueries,
                isDisabled: isGeneratingQueries || isSavingManualEntry,
                onClick: onGenerateSuggestionsClick,
                'data-test-subj': 'significant_events_generate_suggestions_button',
                children: i18n.translate(
                  'xpack.streams.significantEvents.significantEventsGenerationPanel.generateSuggestionsButtonLabel',
                  {
                    defaultMessage: 'Generate suggestions',
                  }
                ),
              }}
              aiFeatures={aiFeatures}
            />
          </EuiFlexItem>
        </EuiPanel>
      </EuiFlexItem>

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
                  defaultMessage: 'or create significant events with',
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
        <EuiFlexGroup
          alignItems="center"
          direction="row"
          justifyContent="spaceEvenly"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill={false}
              data-test-subj="significant_events_manual_entry_button"
              onClick={onManualEntryClick}
              isDisabled={isGeneratingQueries || selectedFlow === 'manual'}
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
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
