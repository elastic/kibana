/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ConnectorListButtonBase } from '../../connector_list_button/connector_list_button';
import type { AIFeatures } from '../../../hooks/use_ai_features';

export function EmptyState({
  onManualEntryClick,
  onGenerateSuggestionsClick,
  aiFeatures,
}: {
  onManualEntryClick: () => void;
  onGenerateSuggestionsClick: () => void;
  aiFeatures: AIFeatures | null;
}) {
  return (
    <EuiEmptyPrompt
      titleSize="xs"
      title={
        <h2>
          {i18n.translate('xpack.streams.significantEvents.emptyState.title', {
            defaultMessage: 'Significant events',
          })}
        </h2>
      }
      body={
        <EuiText size="s" textAlign="center" color="subdued">
          {i18n.translate('xpack.streams.significantEvents.emptyState.description', {
            defaultMessage:
              "Single, 'interesting' log event identified by an automated rule as being important for understanding a system's behaviour.",
          })}
        </EuiText>
      }
      actions={
        <EuiFlexGroup gutterSize="s" justifyContent="center">
          <EuiFlexItem grow={false}>
            <ConnectorListButtonBase
              buttonProps={{
                iconType: 'sparkles',
                onClick: onGenerateSuggestionsClick,
                'data-test-subj': 'significant_events_empty_state_generate_button',
                children: i18n.translate(
                  'xpack.streams.significantEvents.emptyState.generateButton',
                  {
                    defaultMessage: 'Generate with AI',
                  }
                ),
              }}
              aiFeatures={aiFeatures}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="plus"
              onClick={onManualEntryClick}
              data-test-subj="significant_events_empty_state_add_button"
            >
              {i18n.translate('xpack.streams.significantEvents.emptyState.addButton', {
                defaultMessage: 'Add manually',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
}
