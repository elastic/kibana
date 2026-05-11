/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { FC, ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiScreenReaderOnly, EuiTitle } from '@elastic/eui';

import { useUrlState } from '@kbn/ml-url-state';
import { useStorage } from '@kbn/ml-local-storage';
import {
  useTimefilter,
  DatePickerWrapper,
  FullTimeRangeSelector,
  type FullTimeRangeSelectorProps,
  FROZEN_TIER_PREFERENCE,
} from '@kbn/ml-date-picker';

import moment from 'moment';
import { useDataSource } from '../../hooks/use_data_source';
import {
  AIOPS_FROZEN_TIER_PREFERENCE,
  type AiOpsKey,
  type AiOpsStorageMapped,
} from '../../types/storage';

const maxInlineSizeStyles = css`
  max-inline-size: 100%;
  min-inline-size: 0;
`;

export interface PageHeaderProps {
  /** Screen-reader page title rendered as an h1 when `headerContent` is provided. */
  pageTitle?: ReactNode;
  /** Optional content rendered to the right of the header content */
  rightSideItems?: ReactNode;
  /**
   * When provided, rendered on the left side of the header in place of the
   * static data view title. Typically the data source picker component.
   */
  headerContent?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ pageTitle, rightSideItems, headerContent }) => {
  const [, setGlobalState] = useUrlState('_g');
  const { dataView } = useDataSource();

  const [frozenDataPreference, setFrozenDataPreference] = useStorage<
    AiOpsKey,
    AiOpsStorageMapped<typeof AIOPS_FROZEN_TIER_PREFERENCE>
  >(
    AIOPS_FROZEN_TIER_PREFERENCE,
    // By default we will exclude frozen data tier
    FROZEN_TIER_PREFERENCE.EXCLUDE
  );

  const timefilter = useTimefilter({
    timeRangeSelector: dataView.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

  const updateTimeState = useCallback<NonNullable<FullTimeRangeSelectorProps['callback']>>(
    (update) => {
      setGlobalState({
        time: {
          from: moment(update.start.epoch).toISOString(),
          to: moment(update.end.epoch).toISOString(),
        },
      });
    },
    [setGlobalState]
  );

  const hasValidTimeField = useMemo(
    () => dataView.timeFieldName !== undefined && dataView.timeFieldName !== '',
    [dataView.timeFieldName]
  );

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s" wrap={true}>
      <EuiFlexItem grow={false}>
        {headerContent !== undefined ? (
          <>
            {pageTitle ? (
              <EuiScreenReaderOnly>
                <h1>{pageTitle}</h1>
              </EuiScreenReaderOnly>
            ) : null}
            <EuiFlexGroup responsive={false} wrap alignItems="center" gutterSize="m">
              <EuiFlexItem grow={false}>{headerContent}</EuiFlexItem>
              {rightSideItems ? <EuiFlexItem grow={false}>{rightSideItems}</EuiFlexItem> : null}
            </EuiFlexGroup>
          </>
        ) : (
          <EuiTitle size="l">
            <h2>{dataView.getName()}</h2>
          </EuiTitle>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={maxInlineSizeStyles}>
        <EuiFlexGroup
          css={maxInlineSizeStyles}
          alignItems="center"
          gutterSize="s"
          data-test-subj="aiopsTimeRangeSelectorSection"
        >
          {hasValidTimeField && (
            <EuiFlexItem grow={false}>
              <FullTimeRangeSelector
                frozenDataPreference={frozenDataPreference}
                setFrozenDataPreference={setFrozenDataPreference}
                dataView={dataView}
                query={undefined}
                disabled={false}
                timefilter={timefilter}
                callback={updateTimeState}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false} css={maxInlineSizeStyles}>
            <DatePickerWrapper
              isAutoRefreshOnly={!hasValidTimeField}
              showRefresh={!hasValidTimeField}
              width="full"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
