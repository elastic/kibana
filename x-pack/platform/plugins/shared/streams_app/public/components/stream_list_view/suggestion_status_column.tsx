/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiBadge,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TaskStatus } from '@kbn/streams-schema';
import type { PipelineSuggestionBulkStatusItem } from '@kbn/streams-plugin/common';

interface SuggestionStatusColumnProps {
  streamName: string;
  status: PipelineSuggestionBulkStatusItem | undefined;
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

  // No suggestion task exists for this stream
  if (!status) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <span aria-label={NO_SUGGESTION_ARIA_LABEL}>-</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Suggestion is available (completed or acknowledged)
  if (status.hasSuggestion) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={SUGGESTION_AVAILABLE_TOOLTIP}>
            <EuiBadge
              color="success"
              data-test-subj={`suggestionStatusBadge-${streamName}`}
              aria-label={SUGGESTION_AVAILABLE_ARIA_LABEL}
            >
              {SUGGESTION_AVAILABLE_LABEL}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Suggestion is in progress
  if (status.status === TaskStatus.InProgress || status.status === TaskStatus.NotStarted) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span
            data-test-subj={`suggestionStatusInProgress-${streamName}`}
            aria-label={SUGGESTION_IN_PROGRESS_ARIA_LABEL}
          >
            {SUGGESTION_IN_PROGRESS_LABEL}
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Suggestion failed
  if (status.status === TaskStatus.Failed) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={SUGGESTION_FAILED_TOOLTIP}>
            <EuiIcon
              type="warning"
              color="danger"
              data-test-subj={`suggestionStatusFailed-${streamName}`}
              aria-label={SUGGESTION_FAILED_ARIA_LABEL}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Suggestion is stale or being canceled
  if (status.status === TaskStatus.Stale || status.status === TaskStatus.BeingCanceled) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={SUGGESTION_STALE_TOOLTIP}>
            <EuiIcon
              type="clock"
              color="subdued"
              data-test-subj={`suggestionStatusStale-${streamName}`}
              aria-label={SUGGESTION_STALE_ARIA_LABEL}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Canceled
  if (status.status === TaskStatus.Canceled) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <span aria-label={SUGGESTION_CANCELED_ARIA_LABEL}>-</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Fallback
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <span>-</span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// Translations
const SUGGESTION_AVAILABLE_LABEL = i18n.translate(
  'xpack.streams.suggestionStatusColumn.availableLabel',
  {
    defaultMessage: 'Available',
  }
);

const SUGGESTION_AVAILABLE_TOOLTIP = i18n.translate(
  'xpack.streams.suggestionStatusColumn.availableTooltip',
  {
    defaultMessage: 'A pipeline suggestion is available for this stream',
  }
);

const SUGGESTION_AVAILABLE_ARIA_LABEL = i18n.translate(
  'xpack.streams.suggestionStatusColumn.availableAriaLabel',
  {
    defaultMessage: 'Pipeline suggestion available',
  }
);

const NO_SUGGESTION_ARIA_LABEL = i18n.translate(
  'xpack.streams.suggestionStatusColumn.noSuggestionAriaLabel',
  {
    defaultMessage: 'No pipeline suggestion',
  }
);

const SUGGESTION_IN_PROGRESS_LABEL = i18n.translate(
  'xpack.streams.suggestionStatusColumn.inProgressLabel',
  {
    defaultMessage: 'Generating...',
  }
);

const SUGGESTION_IN_PROGRESS_ARIA_LABEL = i18n.translate(
  'xpack.streams.suggestionStatusColumn.inProgressAriaLabel',
  {
    defaultMessage: 'Pipeline suggestion is being generated',
  }
);

const SUGGESTION_FAILED_TOOLTIP = i18n.translate(
  'xpack.streams.suggestionStatusColumn.failedTooltip',
  {
    defaultMessage: 'Failed to generate pipeline suggestion',
  }
);

const SUGGESTION_FAILED_ARIA_LABEL = i18n.translate(
  'xpack.streams.suggestionStatusColumn.failedAriaLabel',
  {
    defaultMessage: 'Pipeline suggestion failed',
  }
);

const SUGGESTION_STALE_TOOLTIP = i18n.translate(
  'xpack.streams.suggestionStatusColumn.staleTooltip',
  {
    defaultMessage: 'Pipeline suggestion task is stale or being canceled',
  }
);

const SUGGESTION_STALE_ARIA_LABEL = i18n.translate(
  'xpack.streams.suggestionStatusColumn.staleAriaLabel',
  {
    defaultMessage: 'Pipeline suggestion task is stale',
  }
);

const SUGGESTION_CANCELED_ARIA_LABEL = i18n.translate(
  'xpack.streams.suggestionStatusColumn.canceledAriaLabel',
  {
    defaultMessage: 'Pipeline suggestion was canceled',
  }
);
