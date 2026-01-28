/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SuggestionBulkStatusItem } from '@kbn/streams-plugin/common';

interface SuggestionStatusColumnProps {
  streamName: string;
  status: SuggestionBulkStatusItem | undefined;
  isLoading: boolean;
}

export function SuggestionStatusColumn({
  streamName,
  status,
  isLoading,
}: SuggestionStatusColumnProps) {
  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // No suggestions available for this stream
  if (!status || status.suggestionCount === 0) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <span aria-label={NO_SUGGESTION_ARIA_LABEL}>-</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Suggestions are available - show count
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiToolTip content={getSuggestionTooltip(status.suggestionCount)}>
          <EuiBadge
            color="success"
            data-test-subj={`suggestionStatusBadge-${streamName}`}
            aria-label={getSuggestionAriaLabel(status.suggestionCount)}
          >
            {status.suggestionCount}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// Translations
const NO_SUGGESTION_ARIA_LABEL = i18n.translate(
  'xpack.streams.suggestionStatusColumn.noSuggestionAriaLabel',
  {
    defaultMessage: 'No suggestions',
  }
);

function getSuggestionTooltip(count: number): string {
  return i18n.translate('xpack.streams.suggestionStatusColumn.availableTooltip', {
    defaultMessage:
      '{count, plural, one {# suggestion is} other {# suggestions are}} available for this stream',
    values: { count },
  });
}

function getSuggestionAriaLabel(count: number): string {
  return i18n.translate('xpack.streams.suggestionStatusColumn.availableAriaLabel', {
    defaultMessage: '{count, plural, one {# suggestion} other {# suggestions}} available',
    values: { count },
  });
}
