/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { APIReturnType } from '@kbn/streams-plugin/public/api';
import { ValuesType } from 'utility-types';

export interface GrokPatternSuggestionProps {
  suggestion: ValuesType<APIReturnType<'POST /internal/streams/{name}/processing/_suggestions'>>;
  onAccept(): void;
  onDismiss(): void;
}

export function GrokPatternSuggestion({
  suggestion,
  onAccept,
  onDismiss,
}: GrokPatternSuggestionProps) {
  const processorMetrics = suggestion.simulationResult.processors_metrics['grok-processor'];
  return (
    <EuiCallOut
      iconType="sparkles"
      title={suggestion.description}
      color="primary"
      size="s"
      onDismiss={onDismiss}
    >
      {suggestion.grokProcessor.patterns.map((pattern, index) => (
        <EuiCodeBlock key={pattern} paddingSize="none" language="regex" transparentBackground>
          {pattern}
        </EuiCodeBlock>
      ))}
      <EuiFlexGroup
        gutterSize="m"
        responsive={false}
        wrap={false}
        alignItems="flexStart"
        direction="column"
      >
        <EuiFlexItem grow={false}>
          <EuiBadgeGroup>
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.grokPatternSuggestion.matchRateBadge',
                {
                  defaultMessage: '{percentage}% Matched',
                  values: {
                    percentage: (processorMetrics.parsed_rate * 100).toFixed(),
                  },
                }
              )}
            </EuiBadge>
            <EuiBadge color="hollow">
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.grokPatternSuggestion.fieldCountBadge',
                {
                  defaultMessage: '{count} Fields',
                  values: {
                    count: processorMetrics.detected_fields.length,
                  },
                }
              )}
            </EuiBadge>
          </EuiBadgeGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="check" onClick={onAccept} color="primary" size="s">
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.grokPatternSuggestion.acceptButton',
              {
                defaultMessage: 'Accept',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
