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
  EuiText,
  EuiLink,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
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
          <span aria-label={NO_SUGGESTION_ARIA_LABEL}>-</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const availableCount = status ? status.pipelineCount : 0;
  const inProgressCount = status ? status.pipelineInProgressCount : 0;
  const failedCount = status ? status.pipelineFailedCount : 0;

  if (inProgressCount > 0) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {GENERATING_LABEL}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!status || (availableCount === 0 && failedCount === 0)) {
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

  const processingLink = router.link('/{key}/management/{tab}', {
    path: { key: streamName, tab: 'processing' },
  });

  const getBadgeLabel = (): string => {
    if (availableCount > 0 && failedCount > 0) {
      return i18n.translate('xpack.streams.suggestionStatusColumn.mixedBadgeLabel', {
        defaultMessage: '{available} available, {failed} failed',
        values: { available: availableCount, failed: failedCount },
      });
    }
    if (failedCount > 0) {
      return i18n.translate('xpack.streams.suggestionStatusColumn.failedBadgeLabel', {
        defaultMessage: '{count} failed',
        values: { count: failedCount },
      });
    }
    return i18n.translate('xpack.streams.suggestionStatusColumn.availableBadgeLabel', {
      defaultMessage: '{count} available',
      values: { count: availableCount },
    });
  };

  const getBadgeColor = (): 'primary' | 'warning' => {
    if (failedCount > 0 && availableCount === 0) {
      return 'warning';
    }
    return 'primary';
  };

  const createdAt = status?.pipelineCreatedAt;

  const popoverContent = (
    <div style={{ maxWidth: 280 }}>
      <EuiTitle size="xxxs">
        <h4>{REVIEW_SUGGESTIONS_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        {availableCount > 0 && failedCount > 0 ? (
          <p>
            {i18n.translate('xpack.streams.suggestionStatusColumn.mixedPopoverDescription', {
              defaultMessage:
                '{available, plural, one {# processing suggestion} other {# processing suggestions}} available. {failed, plural, one {# processing suggestion} other {# processing suggestions}} failed.',
              values: { available: availableCount, failed: failedCount },
            })}
          </p>
        ) : failedCount > 0 ? (
          <p>
            {i18n.translate('xpack.streams.suggestionStatusColumn.failedPopoverDescription', {
              defaultMessage:
                'Something went wrong while creating the processing suggestion{count, plural, one {} other {s}}.',
              values: { count: failedCount },
            })}
          </p>
        ) : (
          <p>
            {i18n.translate('xpack.streams.suggestionStatusColumn.availablePopoverDescription', {
              defaultMessage: 'Review new processing suggestion{count, plural, one {} other {s}}.',
              values: { count: availableCount },
            })}
          </p>
        )}
        {createdAt && (
          <p>
            <EuiText size="xs" color="subdued">
              <FormattedRelative value={new Date(createdAt)} />
            </EuiText>
          </p>
        )}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiLink href={processingLink} data-test-subj={`suggestionLink-${streamName}-processing`}>
        {failedCount > 0 && availableCount === 0
          ? REVIEW_IN_PROCESSING_PAGE_FAILED
          : REVIEW_IN_PROCESSING_PAGE}
      </EuiLink>
    </div>
  );

  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiBadge
              color={getBadgeColor()}
              data-test-subj={`suggestionStatusBadge-${streamName}`}
              aria-label={getSuggestionAriaLabel(availableCount, failedCount)}
              onClick={togglePopover}
              onClickAriaLabel={OPEN_SUGGESTIONS_POPOVER_ARIA_LABEL}
            >
              {getBadgeLabel()}
            </EuiBadge>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="downCenter"
          panelPaddingSize="m"
        >
          {popoverContent}
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

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

const GENERATING_LABEL = i18n.translate('xpack.streams.suggestionStatusColumn.generatingLabel', {
  defaultMessage: 'Generating...',
});

const REVIEW_SUGGESTIONS_TITLE = i18n.translate(
  'xpack.streams.suggestionStatusColumn.reviewSuggestionsTitle',
  {
    defaultMessage: 'Review suggestions',
  }
);

const REVIEW_IN_PROCESSING_PAGE = i18n.translate(
  'xpack.streams.suggestionStatusColumn.reviewInProcessingPage',
  {
    defaultMessage: 'Review in processing page',
  }
);

const REVIEW_IN_PROCESSING_PAGE_FAILED = i18n.translate(
  'xpack.streams.suggestionStatusColumn.reviewInProcessingPageFailed',
  {
    defaultMessage: 'Try again in processing page',
  }
);

function getSuggestionAriaLabel(availableCount: number, failedCount: number): string {
  if (availableCount > 0 && failedCount > 0) {
    return i18n.translate('xpack.streams.suggestionStatusColumn.mixedAriaLabel', {
      defaultMessage:
        '{available, plural, one {# suggestion} other {# suggestions}} available, {failed, plural, one {# suggestion} other {# suggestions}} failed',
      values: { available: availableCount, failed: failedCount },
    });
  }
  if (failedCount > 0) {
    return i18n.translate('xpack.streams.suggestionStatusColumn.failedAriaLabel', {
      defaultMessage: '{count, plural, one {# suggestion} other {# suggestions}} failed',
      values: { count: failedCount },
    });
  }
  return i18n.translate('xpack.streams.suggestionStatusColumn.availableAriaLabel', {
    defaultMessage: '{count, plural, one {# suggestion} other {# suggestions}} available',
    values: { count: availableCount },
  });
}
