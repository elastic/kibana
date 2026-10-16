/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import type { IconType } from '@elastic/eui';

interface ShowMoreFooterProps {
  label: string;
  onClick: () => void;
  ariaLabel?: string;
  /** Defaults to a down chevron; pass an up chevron for a "Show fewer" footer. */
  iconType?: IconType;
  isLoading?: boolean;
  /** A later page failed: shows `errorMessage` and turns the button into a retry. */
  hasError?: boolean;
  errorMessage?: string;
  retryLabel?: string;
  'data-test-subj': string;
  errorDataTestSubj?: string;
}

/**
 * The "Show more" footer shared by the queues. Render it as a sibling of the rows, so the
 * last row keeps its divider above it.
 */
export const ShowMoreFooter = memo<ShowMoreFooterProps>(
  ({
    label,
    onClick,
    ariaLabel,
    iconType = 'chevronSingleDown',
    isLoading = false,
    hasError = false,
    errorMessage,
    retryLabel,
    'data-test-subj': dataTestSubj,
    errorDataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        responsive={false}
        gutterSize="none"
        css={{
          // Keeps the hover fill and focus ring off the row's borders.
          padding: euiTheme.size.xs,
          cursor: 'default',
        }}
      >
        {/* The rows that did load stay put; only this says the click failed,
            and the control below it is the retry. */}
        {hasError && errorMessage ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="danger" role="alert" data-test-subj={errorDataTestSubj}>
              {errorMessage}
            </EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            color={hasError ? 'danger' : 'text'}
            iconType={hasError ? 'refresh' : iconType}
            isLoading={isLoading}
            onClick={onClick}
            aria-label={ariaLabel}
            data-test-subj={dataTestSubj}
          >
            {hasError && retryLabel ? retryLabel : label}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ShowMoreFooter.displayName = 'ShowMoreFooter';
