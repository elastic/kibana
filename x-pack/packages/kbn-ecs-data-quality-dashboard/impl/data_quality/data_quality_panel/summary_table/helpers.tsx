/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
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
import styled from 'styled-components';

import { EMPTY_STAT, getIlmPhaseDescription, getIncompatibleStatColor } from '../../helpers';
import { INCOMPATIBLE_INDEX_TOOL_TIP } from '../stat_label/translations';
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

export const getSummaryTableColumns = ({
  formatNumber,
  itemIdToExpandedRowMap,
  toggleExpanded,
}: {
  formatNumber: (value: number | undefined) => string;
  itemIdToExpandedRowMap: Record<string, React.ReactNode>;
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
          <EuiIcon color={getResultIconColor(incompatible)} type={getResultIcon(incompatible)} />
        </EuiToolTip>
      ) : (
        <EuiToolTip content={getResultToolTip(incompatible)}>
          <span>{EMPTY_STAT}</span>
        </EuiToolTip>
      ),
    sortable: true,
    truncateText: false,
    width: '50px',
  },
  {
    field: 'indexName',
    name: i18n.INDEX,
    render: (_, { indexName, pattern }) => (
      <EuiToolTip content={i18n.INDEX_TOOL_TIP(pattern)}>
        <span aria-roledescription={i18n.INDEX_NAME_LABEL}>{indexName}</span>
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
          description={EMPTY_DESCRIPTION}
          reverse
          title={incompatible ?? EMPTY_STAT}
          titleColor={getIncompatibleStatColor(incompatible)}
          titleSize={STAT_TITLE_SIZE}
        />
      </EuiToolTip>
    ),
    sortable: false,
    truncateText: false,
  },
  {
    field: 'ilmPhase',
    name: i18n.ILM_PHASE,
    render: (_, { ilmPhase }) =>
      ilmPhase != null ? (
        <EuiToolTip content={getIlmPhaseDescription(ilmPhase)}>
          <EuiBadge color="hollow">{ilmPhase}</EuiBadge>
        </EuiToolTip>
      ) : null,
    sortable: false,
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
