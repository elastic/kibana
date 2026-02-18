/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { getPercentageFormatter } from '../../../util/formatters';
import {
  useStreamSamplesSelector,
  type DocumentMatchFilterOptions,
} from './state_management/stream_routing_state_machine';

export interface DocumentMatchFilterControlsProps {
  onFilterChange: (filter: DocumentMatchFilterOptions) => void;
  matchedDocumentPercentage?: number | null;
  isDisabled?: boolean;
}

const percentageFormatter = getPercentageFormatter({ precision: 1 });

export const DocumentMatchFilterControls = ({
  onFilterChange,
  matchedDocumentPercentage,
  isDisabled = false,
}: DocumentMatchFilterControlsProps) => {
  const documentMatchFilter = useStreamSamplesSelector(
    (snapshot) => snapshot.context.documentMatchFilter
  );

  const handleFilterChanged = useCallback(
    (value: DocumentMatchFilterOptions) => {
      if (value === documentMatchFilter) return;

      onFilterChange(value);
    },
    [documentMatchFilter, onFilterChange]
  );

  const hasNoValue =
    isDisabled || matchedDocumentPercentage === undefined || matchedDocumentPercentage === null;

  if (hasNoValue) {
    return null;
  }

  return (
    <EuiFlexItem grow={false} data-test-subj="routingPreviewFilterControls">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed fullWidth>
            <EuiFilterButton
              aria-label={i18n.translate(
                'xpack.streams.streamDetail.preview.filter.matchedAriaLabel',
                { defaultMessage: 'Filter for matched documents.' }
              )}
              data-test-subj="routingPreviewMatchedFilterButton"
              hasActiveFilters={documentMatchFilter === 'matched'}
              onClick={() => handleFilterChanged('matched')}
              isSelected={documentMatchFilter === 'matched'}
              badgeColor="success"
              grow={false}
              isToggle
              numActiveFilters={percentageFormatter.format(matchedDocumentPercentage)}
            >
              {i18n.translate('xpack.streams.streamDetail.preview.filter.matched', {
                defaultMessage: 'Matched',
              })}
            </EuiFilterButton>
            <EuiFilterButton
              aria-label={i18n.translate(
                'xpack.streams.streamDetail.preview.filter.unmatchedAriaLabel',
                { defaultMessage: 'Filter for unmatched documents.' }
              )}
              data-test-subj="routingPreviewUnmatchedFilterButton"
              hasActiveFilters={documentMatchFilter === 'unmatched'}
              onClick={() => handleFilterChanged('unmatched')}
              isSelected={documentMatchFilter === 'unmatched'}
              badgeColor="accent"
              grow={false}
              isToggle
              numActiveFilters={percentageFormatter.format(
                Math.max(1 - matchedDocumentPercentage, 0)
              )}
            >
              {i18n.translate('xpack.streams.streamDetail.preview.filter.unmatched', {
                defaultMessage: 'Unmatched',
              })}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false} data-test-subj="routingPreviewFilterControlsTooltip">
          <EuiIconTip
            aria-label={i18n.translate(
              'xpack.streams.streamRouting.previewMatchesTooltipAriaLabel',
              {
                defaultMessage: 'Additional information',
              }
            )}
            type={'question'}
            content={i18n.translate('xpack.streams.streamDetail.previewMatchesTooltipText', {
              defaultMessage:
                'Approximate percentage of documents matching/unmatching the condition over a random sample of documents.',
            })}
            iconProps={{ style: { verticalAlign: 'text-bottom', marginLeft: 2 } }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
