/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSkeletonText } from '@elastic/eui';
import { FormattedNumber } from '@kbn/i18n-react';
import * as i18n from '../translations';

export interface InsightsSummaryRowProps {
  isLoading: boolean;
  isError: boolean;
  text: ReactNode;
  count: number;
  /** Opens the tool with the details; the count is not clickable without it. */
  onShowDetails?: () => void;
  'data-test-subj': string;
}

/**
 * A text and a clickable count, the row of the Security flyout v2 insights previews (such as
 * Correlations > Related cases). Renders nothing on error, like them.
 */
export const InsightsSummaryRow = ({
  isLoading,
  isError,
  text,
  count,
  onShowDetails,
  'data-test-subj': dataTestSubj,
}: InsightsSummaryRowProps) => {
  if (isLoading) {
    return (
      <EuiSkeletonText
        lines={1}
        size="m"
        isLoading
        contentAriaLabel={i18n.LOADING}
        data-test-subj={`${dataTestSubj}Loading`}
      />
    );
  }

  if (isError) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="none"
      justifyContent="spaceBetween"
      alignItems="center"
      responsive={false}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem
        data-test-subj={`${dataTestSubj}Text`}
        css={css`
          word-break: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        `}
      >
        {text}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          <EuiButtonEmpty
            aria-label={i18n.SHOW_DETAILS}
            onClick={onShowDetails}
            disabled={!onShowDetails}
            flush="both"
            size="xs"
            data-test-subj={`${dataTestSubj}Button`}
          >
            <FormattedNumber value={count} />
          </EuiButtonEmpty>
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

InsightsSummaryRow.displayName = 'InsightsSummaryRow';
