/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiProgress,
  EuiHealth,
  EuiText,
  EuiBasicTable,
} from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import type { RefreshToken } from './types';
import type { LoadRuleGapsProps } from '../../../hooks/use_load_rule_gaps';
import { useLoadRuleGaps } from '../../../hooks/use_load_rule_gaps';
import type { Gap } from '../../../lib/rule_api/load_gaps';
import { FillGap } from './fill_gap';

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'partially_filled':
      return 'Partially filled';
    case 'unfilled':
      return 'Unfilled';
    case 'filled':
      return 'Filled';
  }
  return '';
};
const getGapsTableColumns = (ruleId: string) => {
  const columns: Array<EuiBasicTableColumn<Gap>> = [
    {
      field: 'status',
      sortable: false,
      name: 'Status',
      render: (value: string) => getStatusLabel(value),
      width: '10%',
    },
    {
      field: '@timestamp',
      sortable: false,
      name: 'Detected at',
      render: (value: Gap['@timestamp']) => {
        const date = moment(new Date(value));
        return (
          <FormattedRelative
            data-test-subj="humanized-relative-date"
            value={moment.utc(date).toDate()}
          />
        );
      },
      width: '15%',
    },
    {
      field: 'in_progress_intervals',
      name: 'Manual fill tasks',
      render: (value: Gap['in_progress_intervals']) => {
        if (!value || !value.length) return null;
        return <EuiHealth color={'primary'}>{'In progress'}</EuiHealth>;
      },
      width: '10%',
    },
    {
      width: '10%',
      align: 'right',
      name: 'Event time covered',
      render: (item: Gap) => {
        if (!item) return null;
        const value = Math.ceil((item.filled_duration_ms * 100) / item.total_gap_duration_ms);
        return (
          <EuiFlexGroup
            alignItems="center"
            data-test-subj="rule-gaps-progress-bar"
            justifyContent="flexEnd"
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <p>
                  {value}
                  {'%'}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem css={{ maxWidth: '40px' }}>
              <EuiProgress value={value} max={100} size="xs" />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'range',
      name: 'Range',
      render: (value: Gap['range']) => {
        return (
          <>
            {moment.utc(value.gte).format('LLL')}
            {' - '}
            {moment.utc(value.lte).format('LLL')}
          </>
        );
      },
      width: '40%',
    },
    {
      field: 'total_gap_duration_ms',
      sortable: true,
      name: 'Total gap duration',
      render: (value: Gap['total_gap_duration_ms']) => (
        <> {value != null ? moment.duration(value, 'ms').humanize() : '-'}</>
      ),
      width: '10%',
    },
    {
      name: 'Actions',
      align: 'right' as const,
      render: (gap: Gap) => <FillGap ruleId={ruleId} gap={gap} />,
      width: '15%',
    },
  ];

  return columns;
};

const API_FAILED_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.ruleDetails.eventLogColumn.apiError',
  {
    defaultMessage: 'Failed to fetch rule gaps',
  }
);

export interface RuleGapListCommon {
  ruleId: string;
  localStorageKey?: string;
  refreshToken?: RefreshToken;
  initialPageSize?: number;
  hasRuleNames?: boolean;
  hasAllSpaceSwitch?: boolean;
  filteredRuleTypes?: string[];
  setHeaderActions?: (components?: React.ReactNode[]) => void;
  getRuleDetailsRoute?: (ruleId: string) => string;
}

export const RuleGapListTable = (props: RuleGapListCommon) => {
  const { ruleId, refreshToken } = props;

  const { notifications } = useKibana().services;

  // Data grid states
  const [gaps, setGaps] = useState<Gap[]>();

  const isInitialized = useRef(false);

  const onError = useCallback<NonNullable<LoadRuleGapsProps['onError']>>(
    (e) => {
      if (e.body?.statusCode === 413) {
        return;
      }
      notifications.toasts.addDanger({
        title: API_FAILED_MESSAGE,
        text: e.body?.message ?? e,
      });
    },
    [notifications]
  );

  const { data, isLoading, loadRuleGaps } = useLoadRuleGaps({
    id: ruleId,
    onError,
  });

  useEffect(() => {
    if (!data) {
      return;
    }
    setGaps(data.data);
  }, [data]);

  const columns = getGapsTableColumns(ruleId);

  useEffect(() => {
    loadRuleGaps();
  }, [loadRuleGaps]);

  useEffect(() => {
    if (isInitialized.current) {
      loadRuleGaps();
    }
    isInitialized.current = true;
  }, [refreshToken, loadRuleGaps]);

  return (
    <EuiFlexGroup gutterSize="none" direction="column" data-test-subj="ruleEventLogListTable">
      <EuiBasicTable
        data-test-subj="rule-gaps-table"
        items={gaps ?? []}
        columns={columns}
        loading={isLoading}
      />
    </EuiFlexGroup>
  );
};
// eslint-disable-next-line import/no-default-export
export { RuleGapListTable as default };
