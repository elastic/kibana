/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiBadge,
  EuiPopover,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SuggestionBulkStatusItem } from '@kbn/streams-plugin/common';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

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
  const router = useStreamsAppRouter();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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

  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);

  // Build suggestion items for the popover
  const suggestionItems: Array<{ count: number; label: string; tab: string }> = [];

  if (status.featuresCount > 0) {
    suggestionItems.push({
      count: status.featuresCount,
      label: getPartitioningSuggestionLabel(status.featuresCount),
      tab: 'partitioning',
    });
  }

  if (status.significantEventsCount > 0) {
    suggestionItems.push({
      count: status.significantEventsCount,
      label: getSignificantEventsSuggestionLabel(status.significantEventsCount),
      tab: 'significantEvents',
    });
  }

  if (status.pipelineCount > 0) {
    suggestionItems.push({
      count: status.pipelineCount,
      label: getProcessingSuggestionLabel(status.pipelineCount),
      tab: 'processing',
    });
  }

  const popoverContent = (
    <EuiFlexGroup direction="column" gutterSize="s">
      {suggestionItems.map((item) => (
        <EuiFlexItem key={item.tab}>
          <EuiLink
            href={router.link('/{key}/management/{tab}', {
              path: { key: streamName, tab: item.tab },
            })}
            data-test-subj={`suggestionLink-${streamName}-${item.tab}`}
          >
            <EuiText size="s">{item.label}</EuiText>
          </EuiLink>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );

  // Suggestions are available - show count with popover
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiBadge
              color="success"
              data-test-subj={`suggestionStatusBadge-${streamName}`}
              aria-label={getSuggestionAriaLabel(status.suggestionCount)}
              onClick={togglePopover}
              onClickAriaLabel={OPEN_SUGGESTIONS_POPOVER_ARIA_LABEL}
            >
              {status.suggestionCount}
            </EuiBadge>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="downCenter"
          panelPaddingSize="s"
        >
          {popoverContent}
        </EuiPopover>
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

const OPEN_SUGGESTIONS_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.streams.suggestionStatusColumn.openPopoverAriaLabel',
  {
    defaultMessage: 'Open suggestions details',
  }
);

function getSuggestionAriaLabel(count: number): string {
  return i18n.translate('xpack.streams.suggestionStatusColumn.availableAriaLabel', {
    defaultMessage: '{count, plural, one {# suggestion} other {# suggestions}} available',
    values: { count },
  });
}

function getPartitioningSuggestionLabel(count: number): string {
  return i18n.translate('xpack.streams.suggestionStatusColumn.partitioningSuggestionLabel', {
    defaultMessage:
      '{count, plural, one {# partitioning suggestion} other {# partitioning suggestions}}',
    values: { count },
  });
}

function getSignificantEventsSuggestionLabel(count: number): string {
  return i18n.translate('xpack.streams.suggestionStatusColumn.significantEventsSuggestionLabel', {
    defaultMessage:
      '{count, plural, one {# significant events suggestion} other {# significant events suggestions}}',
    values: { count },
  });
}

function getProcessingSuggestionLabel(count: number): string {
  return i18n.translate('xpack.streams.suggestionStatusColumn.processingSuggestionLabel', {
    defaultMessage:
      '{count, plural, one {# processing suggestion} other {# processing suggestions}}',
    values: { count },
  });
}
