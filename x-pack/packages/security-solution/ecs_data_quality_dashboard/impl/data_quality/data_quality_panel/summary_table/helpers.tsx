/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiText,
  EuiBadge,
  EuiButtonIcon,
  EuiIcon,
  EuiProgress,
  EuiScreenReaderOnly,
  EuiStat,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import React from 'react';
import moment from 'moment';
import styled from 'styled-components';

import { EMPTY_STAT, getIlmPhaseDescription, getIncompatibleStatColor } from '../../helpers';
import { INCOMPATIBLE_INDEX_TOOL_TIP } from '../stat_label/translations';
import { INDEX_SIZE_TOOLTIP } from '../../translations';
import * as i18n from './translations';
import type { IlmPhase } from '../../types';

const STAT_TITLE_SIZE = 'xxs';

const EMPTY_DESCRIPTION = ' ';

const ProgressContainer = styled.div`
  width: 150px;
`;

export interface IndexSummaryTableItem {
  docsCount: number;
  incompatible: number | undefined;
  indexName: string;
  ilmPhase: IlmPhase | undefined;
  pattern: string;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
  checkedAt: number | undefined;
}

export const getResultToolTip = (incompatible: number | undefined): string => {
  if (incompatible == null) {
    return i18n.THIS_INDEX_HAS_NOT_BEEN_CHECKED;
  } else if (incompatible === 0) {
    return i18n.PASSED;
  } else {
    return i18n.FAILED;
  }
};

export const getResultIconColor = (
  incompatible: number | undefined
): 'success' | 'danger' | 'ghost' => {
  if (incompatible == null) {
    return 'ghost';
  } else if (incompatible === 0) {
    return 'success';
  } else {
    return 'danger';
  }
};

export const getResultIcon = (incompatible: number | undefined): 'check' | 'cross' =>
  incompatible === 0 ? 'check' : 'cross';

export const getDocsCountPercent = ({
  docsCount,
  locales,
  patternDocsCount,
}: {
  docsCount: number;
  locales?: string | string[];
  patternDocsCount: number;
}): string =>
  patternDocsCount !== 0
    ? Number(docsCount / patternDocsCount).toLocaleString(locales, {
        style: 'percent',
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })
    : '';

export const getToggleButtonId = ({
  indexName,
  isExpanded,
  pattern,
}: {
  indexName: string;
  isExpanded: boolean;
  pattern: string;
}): string => (isExpanded ? `collapse${indexName}${pattern}` : `expand${indexName}${pattern}`);

export const getSummaryTableILMPhaseColumn = (
  isILMAvailable: boolean
): Array<EuiBasicTableColumn<IndexSummaryTableItem>> =>
  isILMAvailable
    ? [
        {
          field: 'ilmPhase',
          name: i18n.ILM_PHASE,
          render: (_, { ilmPhase }) =>
            ilmPhase != null ? (
              <EuiToolTip content={getIlmPhaseDescription(ilmPhase)}>
                <EuiBadge color="hollow" data-test-subj="ilmPhase">
                  {ilmPhase}
                </EuiBadge>
              </EuiToolTip>
            ) : null,
          sortable: true,
          truncateText: false,
        },
      ]
    : [];

export const getSummaryTableSizeInBytesColumn = ({
  isILMAvailable,
  formatBytes,
}: {
  isILMAvailable: boolean;
  formatBytes: (value: number | undefined) => string;
}): Array<EuiBasicTableColumn<IndexSummaryTableItem>> =>
  isILMAvailable
    ? [
        {
          field: 'sizeInBytes',
          name: i18n.SIZE,
          render: (_, { sizeInBytes }) =>
            Number.isInteger(sizeInBytes) ? (
              <EuiToolTip content={INDEX_SIZE_TOOLTIP}>
                <span data-test-subj="sizeInBytes">{formatBytes(sizeInBytes)}</span>
              </EuiToolTip>
            ) : null,
          sortable: true,
          truncateText: false,
        },
      ]
    : [];

export const getSummaryTableColumns = ({
  formatBytes,
  formatNumber,
  itemIdToExpandedRowMap,
  isILMAvailable,
  pattern,
  toggleExpanded,
}: {
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  itemIdToExpandedRowMap: Record<string, React.ReactNode>;
  isILMAvailable: boolean;
  pattern: string;
  toggleExpanded: (indexName: string) => void;
}): Array<EuiBasicTableColumn<IndexSummaryTableItem>> => [
  {
    align: RIGHT_ALIGNMENT,
    isExpander: true,
    name: (
      <EuiScreenReaderOnly>
        <span>{i18n.EXPAND_ROWS}</span>
      </EuiScreenReaderOnly>
    ),
    render: ({ indexName }: IndexSummaryTableItem) => (
      <EuiButtonIcon
        aria-label={itemIdToExpandedRowMap[indexName] ? i18n.COLLAPSE : i18n.EXPAND}
        data-toggle-button-id={getToggleButtonId({
          indexName,
          isExpanded: itemIdToExpandedRowMap[indexName] != null,
          pattern,
        })}
        onClick={() => toggleExpanded(indexName)}
        iconType={itemIdToExpandedRowMap[indexName] ? 'arrowDown' : 'arrowRight'}
      />
    ),
    width: '40px',
  },
  {
    field: 'incompatible',
    name: i18n.RESULT,
    render: (_, { incompatible }) =>
      incompatible != null ? (
        <EuiToolTip content={getResultToolTip(incompatible)}>
          <EuiIcon
            data-test-subj="resultIcon"
            color={getResultIconColor(incompatible)}
            type={getResultIcon(incompatible)}
          />
        </EuiToolTip>
      ) : (
        <EuiToolTip content={getResultToolTip(incompatible)}>
          <span data-test-subj="incompatiblePlaceholder">{EMPTY_STAT}</span>
        </EuiToolTip>
      ),
    sortable: true,
    truncateText: false,
    width: '65px',
  },
  {
    field: 'indexName',
    name: i18n.INDEX,
    render: (_, { indexName }) => (
      <EuiToolTip content={i18n.INDEX_TOOL_TIP(pattern)}>
        <span aria-roledescription={i18n.INDEX_NAME_LABEL} data-test-subj="indexName">
          {indexName}
        </span>
      </EuiToolTip>
    ),
    sortable: true,
    truncateText: false,
    width: '300px',
  },
  {
    field: 'docsCount',
    name: i18n.DOCS,
    render: (_, { docsCount, patternDocsCount }) => (
      <ProgressContainer>
        <EuiProgress
          data-test-subj="docsCount"
          label={formatNumber(docsCount)}
          max={patternDocsCount}
          size="m"
          value={docsCount}
          valueText={getDocsCountPercent({ docsCount, patternDocsCount })}
        />
      </ProgressContainer>
    ),
    sortable: true,
    truncateText: false,
  },
  {
    field: 'incompatible',
    name: i18n.INCOMPATIBLE_FIELDS,
    render: (_, { incompatible, indexName }) => (
      <EuiToolTip content={INCOMPATIBLE_INDEX_TOOL_TIP(indexName)}>
        <EuiStat
          data-test-subj="incompatibleStat"
          description={EMPTY_DESCRIPTION}
          reverse
          title={incompatible ?? EMPTY_STAT}
          titleColor={getIncompatibleStatColor(incompatible)}
          titleSize={STAT_TITLE_SIZE}
        />
      </EuiToolTip>
    ),
    sortable: true,
    truncateText: false,
  },
  ...getSummaryTableILMPhaseColumn(isILMAvailable),
  ...getSummaryTableSizeInBytesColumn({ isILMAvailable, formatBytes }),
  {
    field: 'checkedAt',
    name: i18n.LAST_CHECK,
    render: (_, { checkedAt }) => (
      <EuiText size="xs">
        {checkedAt && moment(checkedAt).isValid() ? moment(checkedAt).fromNow() : EMPTY_STAT}
      </EuiText>
    ),
    sortable: true,
    truncateText: false,
  },
];

export const getShowPagination = ({
  minPageSize,
  totalItemCount,
}: {
  minPageSize: number;
  totalItemCount: number;
}): boolean => totalItemCount > minPageSize;
