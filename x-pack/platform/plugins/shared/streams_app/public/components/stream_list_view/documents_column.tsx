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
  EuiI18nNumber,
  EuiLoadingChart,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { TooltipOrPopoverIcon } from '../tooltip_popover_icon/tooltip_popover_icon';
import { getFormattedError } from '../../util/errors';

export function DocumentsColumn({
  indexPattern,
  docCount,
  isLoading,
  error,
}: {
  indexPattern: string;
  docCount: number;
  isLoading: boolean;
  error?: Error;
}) {
  const { euiTheme } = useEuiTheme();

  const hasData = docCount > 0;

  const noDocCountData = error ? '' : '-';

  const cellAriaLabel = hasData
    ? i18n.translate('xpack.streams.documentsColumn.cellDocCountLabel', {
        defaultMessage: '{docCount} documents in {indexPattern}',
        values: { docCount, indexPattern },
      })
    : i18n.translate('xpack.streams.documentsColumn.cellNoDataLabel', {
        defaultMessage: 'No documents found in {indexPattern}',
        values: { indexPattern },
      });

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      className={css`
        height: ${euiTheme.size.xl};
        white-space: nowrap;
      `}
      role="group"
      aria-label={cellAriaLabel}
    >
      {isLoading ? (
        <LoadingPlaceholder />
      ) : (
        <>
          <EuiFlexItem
            grow={2}
            aria-hidden="true"
            className={css`
              text-align: right;
              font-family: 'Roboto mono', sans-serif;
            `}
            data-test-subj={`streamsDocCount-${indexPattern}`}
          >
            {hasData ? <EuiI18nNumber value={docCount} /> : noDocCountData}
          </EuiFlexItem>
          <EuiFlexItem
            grow={0}
            aria-hidden="true"
            className={css`
              display: flex;
              justify-content: center;
              align-items: center;
              padding-left: ${euiTheme.size.s};
            `}
          >
            {error ? (
              <TooltipOrPopoverIcon
                dataTestSubj="streamsDocCount-error"
                icon="warning"
                title={getFormattedError(error).message}
                mode="popover"
                iconColor="danger"
              />
            ) : null}
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
}

const LoadingPlaceholder = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="flexEnd"
      gutterSize="m"
      className={css`
        height: ${euiTheme.size.xl};
        white-space: nowrap;
        padding-right: ${euiTheme.size.xl};
      `}
    >
      <EuiFlexGroup>
        <EuiFlexItem
          className={css`
            text-align: center;
          `}
        >
          -
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          className={css`
            display: flex;
            padding-right: ${euiTheme.size.xl};
            justify-content: center;
          `}
        >
          <EuiLoadingChart size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
