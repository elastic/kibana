/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiText,
  EuiProgress,
  EuiToolTip,
  CENTER_ALIGNMENT,
  EuiButtonIcon,
} from '@elastic/eui';
import React from 'react';
import moment from 'moment';
import styled from 'styled-components';

import { euiThemeVars } from '@kbn/ui-theme';
import { getDocsCountPercent } from '../../../../../utils/stats';
import { IndexSummaryTableItem } from '../../../../../types';
import { EMPTY_STAT } from '../../../../../constants';
import { getIlmPhaseDescription } from '../../../../../utils/get_ilm_phase_description';
import { INCOMPATIBLE_INDEX_TOOL_TIP } from '../../../../../stat_label/translations';
import {
  DOCS,
  ILM_PHASE_CAPITALIZED,
  INCOMPATIBLE_FIELDS,
  INDEX,
  INDEX_SIZE_TOOLTIP,
  RESULT,
  SIZE,
} from '../../../../../translations';
import * as i18n from '../translations';
import { UseIndicesCheckCheckState } from '../../../../../hooks/use_indices_check/types';
import { IndexResultBadge } from '../../index_result_badge';
import { Stat } from '../../../../../stat';
import { getIndexResultToolTip } from '../../utils/get_index_result_tooltip';

const ProgressContainer = styled.div`
  width: 150px;
`;

export const getSummaryTableILMPhaseColumn = (
  isILMAvailable: boolean
): Array<EuiBasicTableColumn<IndexSummaryTableItem>> =>
  isILMAvailable
    ? [
        {
          field: 'ilmPhase',
          name: ILM_PHASE_CAPITALIZED,
          render: (_, { ilmPhase }) =>
            ilmPhase != null ? (
              <Stat
                badgeText={ilmPhase}
                tooltipText={getIlmPhaseDescription(ilmPhase)}
                badgeProps={{
                  'data-test-subj': 'ilmPhase',
                }}
              />
            ) : null,
          sortable: true,
          truncateText: false,
          width: '92px',
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
          name: SIZE,
          render: (_, { sizeInBytes }) =>
            Number.isInteger(sizeInBytes) ? (
              <EuiToolTip content={INDEX_SIZE_TOOLTIP}>
                <span data-test-subj="sizeInBytes">{formatBytes(sizeInBytes)}</span>
              </EuiToolTip>
            ) : null,
          sortable: true,
          truncateText: false,
          width: '67px',
        },
      ]
    : [];

export const getIncompatibleStatColor = (incompatible: number | undefined): string | undefined =>
  incompatible != null && incompatible > 0 ? euiThemeVars.euiColorDanger : undefined;

export const getSummaryTableColumns = ({
  formatBytes,
  formatNumber,
  isILMAvailable,
  pattern,
  onExpandAction,
  onCheckNowAction,
  checkState,
}: {
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  isILMAvailable: boolean;
  pattern: string;
  onExpandAction: (indexName: string) => void;
  onCheckNowAction: (indexName: string) => void;
  checkState: UseIndicesCheckCheckState;
}): Array<EuiBasicTableColumn<IndexSummaryTableItem>> => [
  {
    name: i18n.ACTIONS,
    align: CENTER_ALIGNMENT,
    width: '65px',
    actions: [
      {
        name: i18n.VIEW_CHECK_DETAILS,
        render: (item) => {
          return (
            <EuiToolTip content={i18n.VIEW_CHECK_DETAILS}>
              <EuiButtonIcon
                iconType="expand"
                aria-label={i18n.VIEW_CHECK_DETAILS}
                onClick={() => onExpandAction(item.indexName)}
              />
            </EuiToolTip>
          );
        },
      },
      {
        name: i18n.CHECK_INDEX,
        render: (item) => {
          const isChecking = checkState[item.indexName]?.isChecking ?? false;
          return (
            <EuiToolTip content={i18n.CHECK_INDEX}>
              <EuiButtonIcon
                iconType="refresh"
                aria-label={i18n.CHECK_INDEX}
                isLoading={isChecking}
                onClick={() => onCheckNowAction(item.indexName)}
              />
            </EuiToolTip>
          );
        },
      },
    ],
  },
  {
    field: 'incompatible',
    name: RESULT,
    render: (_, { incompatible }) =>
      incompatible != null ? (
        <IndexResultBadge incompatible={incompatible} data-test-subj="resultBadge" />
      ) : (
        <EuiToolTip content={getIndexResultToolTip(incompatible)}>
          <span data-test-subj="incompatiblePlaceholder">{EMPTY_STAT}</span>
        </EuiToolTip>
      ),
    sortable: true,
    truncateText: false,
    width: '65px',
  },
  {
    field: 'indexName',
    name: INDEX,
    render: (_, { indexName }) => (
      <EuiToolTip content={i18n.INDEX_TOOL_TIP(pattern)}>
        <span aria-roledescription={i18n.INDEX_NAME_LABEL} data-test-subj="indexName">
          {indexName}
        </span>
      </EuiToolTip>
    ),
    sortable: true,
    truncateText: false,
  },
  {
    field: 'docsCount',
    name: DOCS,
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
    width: '150px',
  },
  {
    field: 'incompatible',
    name: INCOMPATIBLE_FIELDS,
    render: (_, { incompatible }) => (
      <EuiToolTip content={INCOMPATIBLE_INDEX_TOOL_TIP}>
        <EuiText
          size="xs"
          data-test-subj="incompatibleStat"
          color={getIncompatibleStatColor(incompatible)}
        >
          {incompatible ?? EMPTY_STAT}
        </EuiText>
      </EuiToolTip>
    ),
    sortable: true,
    truncateText: false,
    width: '140px',
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
    width: '120px',
  },
];
