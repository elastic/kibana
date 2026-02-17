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
  EuiListGroup,
  EuiListGroupItem,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SuggestionBulkStatusItem } from '@kbn/streams-plugin/common';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

interface SuggestionStatusColumnProps {
  streamName: string;
  status: SuggestionBulkStatusItem | undefined;
  isLoading: boolean;
  onDismiss?: (streamName: string) => void;
}

export function SuggestionStatusColumn({
  streamName,
  status,
  isLoading,
  onDismiss,
}: SuggestionStatusColumnProps) {
  const router = useStreamsAppRouter();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Calculate badge count - only show pipeline suggestions for now
  const badgeCount = status ? status.pipelineCount : 0;

  // No suggestions available for this stream
  if (!status || badgeCount === 0) {
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

  const handleDismiss = async () => {
    if (!onDismiss) return;
    setIsDismissing(true);
    try {
      await onDismiss(streamName);
    } finally {
      setIsDismissing(false);
    }
  };

  // Build suggestion items for the popover - only show pipeline suggestions for now
  const suggestionItems: Array<{ count: number; label: string; tab: string }> = [];

  if (status.pipelineCount > 0) {
    suggestionItems.push({
      count: status.pipelineCount,
      label: getProcessingSuggestionLabel(status.pipelineCount),
      tab: 'processing',
    });
  }

  const popoverContent = (
    <EuiListGroup gutterSize="none" flush>
      {suggestionItems.map((item) => (
        <EuiListGroupItem
          key={item.tab}
          label={item.label}
          href={router.link('/{key}/management/{tab}', {
            path: { key: streamName, tab: item.tab },
          })}
          data-test-subj={`suggestionLink-${streamName}-${item.tab}`}
          size="s"
        />
      ))}
    </EuiListGroup>
  );

  // Suggestions are available - show count with popover and dismiss button
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiBadge
              color="success"
              data-test-subj={`suggestionStatusBadge-${streamName}`}
              aria-label={getSuggestionAriaLabel(badgeCount)}
              onClick={togglePopover}
              onClickAriaLabel={OPEN_SUGGESTIONS_POPOVER_ARIA_LABEL}
            >
              {badgeCount}
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
      {onDismiss && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={DISMISS_SUGGESTION_TOOLTIP}>
            <EuiButtonIcon
              iconType="cross"
              size="xs"
              color="text"
              aria-label={DISMISS_SUGGESTION_ARIA_LABEL}
              data-test-subj={`suggestionDismissButton-${streamName}`}
              onClick={handleDismiss}
              isLoading={isDismissing}
              disabled={isDismissing}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
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

const DISMISS_SUGGESTION_ARIA_LABEL = i18n.translate(
  'xpack.streams.suggestionStatusColumn.dismissAriaLabel',
  {
    defaultMessage: 'Dismiss suggestion',
  }
);

const DISMISS_SUGGESTION_TOOLTIP = i18n.translate(
  'xpack.streams.suggestionStatusColumn.dismissTooltip',
  {
    defaultMessage: 'Dismiss and delete this suggestion',
  }
);

function getSuggestionAriaLabel(count: number): string {
  return i18n.translate('xpack.streams.suggestionStatusColumn.availableAriaLabel', {
    defaultMessage: '{count, plural, one {# suggestion} other {# suggestions}} available',
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
