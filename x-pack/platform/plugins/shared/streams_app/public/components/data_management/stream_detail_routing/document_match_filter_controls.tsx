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
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  useStreamsRoutingSelector,
  type DocumentMatchFilterOptions,
} from './state_management/stream_routing_state_machine';

export interface DocumentMatchFilterControlsProps {
  initialFilter: DocumentMatchFilterOptions;
  onFilterChange: (filter: DocumentMatchFilterOptions) => void;
  matchedDocumentPercentage: number;
  isDisabled?: boolean;
}

export const DocumentMatchFilterControls = ({
  initialFilter,
  onFilterChange,
  matchedDocumentPercentage,
  isDisabled = false,
}: DocumentMatchFilterControlsProps) => {
  const { euiTheme } = useEuiTheme();

  const [selectedFilter, setSelectedFilter] = useState<DocumentMatchFilterOptions>(initialFilter);

  const isIdleState = useStreamsRoutingSelector((snapshot) => snapshot).matches({
    ready: 'idle',
  });

  const handleFilterChanged = useCallback(
    (value: DocumentMatchFilterOptions) => {
      if (value === selectedFilter) return;

      const newFilter = selectedFilter === 'matched' ? 'unmatched' : 'matched';
      onFilterChange(newFilter);
      setSelectedFilter(newFilter);
    },
    [selectedFilter, onFilterChange]
  );

  useEffect(() => {
    if (isIdleState) {
      handleFilterChanged('matched');
    }
  }, [isIdleState, handleFilterChanged]);

  const filterButtonCss = useMemo(
    () => css`
      background-color: transparent !important;
      border: 0px !important;

      &[aria-pressed='true']:not(:disabled) {
        color: ${euiTheme.colors.textParagraph} !important;
      }
    `,
    [euiTheme]
  );

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
              hasActiveFilters={selectedFilter === 'matched'}
              onClick={() => handleFilterChanged('matched')}
              isDisabled={isDisabled || isNaN(matchedDocumentPercentage)}
              isSelected={selectedFilter === 'matched'}
              badgeColor="success"
              grow={false}
              isToggle
              numActiveFilters={
                isNaN(matchedDocumentPercentage) ? '' : `${matchedDocumentPercentage}%`
              }
              css={filterButtonCss}
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
              hasActiveFilters={selectedFilter === 'unmatched'}
              onClick={() => handleFilterChanged('unmatched')}
              isDisabled={isDisabled || isNaN(matchedDocumentPercentage)}
              isSelected={selectedFilter === 'unmatched'}
              badgeColor="accent"
              grow={false}
              isToggle
              numActiveFilters={
                isNaN(matchedDocumentPercentage) ? '' : `${100 - matchedDocumentPercentage}%`
              }
              css={filterButtonCss}
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
