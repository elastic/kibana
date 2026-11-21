/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBasicTable, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useInvestigationsNavigation } from '../../hooks';
import { ActorBadge } from '../shared/actor_badge';
import { PriorityBadge } from '../shared/priority_badge';
import { RelativeTime } from '../shared/relative_time';
import { StatusBadge } from '../shared/status_badge';
import { VerdictBadge, getEffectiveVerdict } from '../shared/verdict_badge';
import * as i18n from './translations';
import { BUSINESS_UNIT_FIELD_KEY, PAGE_SIZE_OPTIONS } from './use_queue_url_state';
import type { QueueState } from './use_queue_url_state';

export interface QueueTableProps {
  records: InvestigationRecord[];
  total: number;
  state: QueueState;
  isLoading: boolean;
  noItemsMessage: React.ReactNode;
  onChange: (change: Partial<QueueState>) => void;
}

const RecordLink: React.FC<{ record: InvestigationRecord; children: React.ReactNode }> = ({
  record,
  children,
}) => {
  const { getRecordPath, getHref, navigate } = useInvestigationsNavigation();
  const path = getRecordPath(record.id);

  return (
    <EuiLink
      href={getHref(path)}
      onClick={(event: React.MouseEvent) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        navigate(path);
      }}
      data-test-subj={`investigationLink-${record.display_id}`}
    >
      {children}
    </EuiLink>
  );
};
RecordLink.displayName = 'RecordLink';

export const QueueTable: React.FC<QueueTableProps> = ({
  records,
  total,
  state,
  isLoading,
  noItemsMessage,
  onChange,
}) => {
  const columns = useMemo<Array<EuiBasicTableColumn<InvestigationRecord>>>(
    () => [
      {
        field: 'display_num',
        name: i18n.COLUMN_ID,
        sortable: true,
        width: '88px',
        render: (_value: number, record) => (
          <RecordLink record={record}>{record.display_id}</RecordLink>
        ),
      },
      {
        field: 'title.keyword',
        name: i18n.COLUMN_TITLE,
        sortable: true,
        width: '280px',
        truncateText: { lines: 2 },
        render: (_value: string, record) => (
          <EuiToolTip content={record.title}>
            <RecordLink record={record}>{record.title}</RecordLink>
          </EuiToolTip>
        ),
      },
      {
        field: 'status',
        name: i18n.COLUMN_STATUS,
        sortable: true,
        width: '130px',
        render: (_value: string, record) => (
          <StatusBadge status={record.status} owner={record.owner} />
        ),
      },
      {
        field: 'priority',
        name: i18n.COLUMN_PRIORITY,
        sortable: true,
        width: '96px',
        render: (_value: string, record) => (
          <PriorityBadge priority={record.priority} note={record.priority_note} />
        ),
      },
      {
        field: 'investigation_type',
        name: i18n.COLUMN_TYPE,
        sortable: true,
        width: '110px',
        render: (value: string) => value,
      },
      {
        field: `fields.${BUSINESS_UNIT_FIELD_KEY}`,
        name: i18n.COLUMN_BUSINESS_UNIT,
        sortable: true,
        width: '120px',
        render: (_value: string, record) => {
          const unit = record.fields[BUSINESS_UNIT_FIELD_KEY];
          return typeof unit === 'string' && unit.length > 0 ? unit : '-';
        },
      },
      {
        field: 'owner',
        name: i18n.COLUMN_OWNER,
        width: '150px',
        render: (_value: unknown, record) =>
          record.owner ? (
            <ActorBadge actor={record.owner} compact />
          ) : (
            <EuiText size="s" color="subdued">
              {i18n.UNASSIGNED}
            </EuiText>
          ),
      },
      {
        field: 'verdict',
        name: i18n.COLUMN_VERDICT,
        width: '170px',
        render: (_value: unknown, record) => {
          const verdict = getEffectiveVerdict(record);
          if (verdict.source === null) {
            return (
              <EuiText size="s" color="subdued">
                {i18n.NO_VALUE}
              </EuiText>
            );
          }
          return (
            <span>
              <VerdictBadge
                label={verdict.label}
                verdict={verdict.classification}
                source={verdict.source}
              />
              {verdict.source === 'agent' ? (
                <EuiText size="xs" color="subdued" component="span">
                  {' '}
                  {i18n.VERDICT_AGENT_SUFFIX}
                </EuiText>
              ) : null}
            </span>
          );
        },
      },
      {
        field: 'counters.alerts',
        name: i18n.COLUMN_ALERTS,
        sortable: true,
        align: 'right',
        width: '72px',
        render: (_value: number, record) => record.counters.alerts,
      },
      {
        field: 'counters.evidence',
        name: i18n.COLUMN_EVIDENCE,
        sortable: true,
        align: 'right',
        width: '84px',
        render: (_value: number, record) => record.counters.evidence,
      },
      {
        field: 'open_claims',
        name: i18n.COLUMN_OPEN_CLAIMS,
        align: 'right',
        width: '96px',
        render: (_value: unknown, record) => record.counters.claims_by_status.open ?? 0,
      },
      {
        field: 'updated_at',
        name: i18n.COLUMN_UPDATED,
        sortable: true,
        width: '104px',
        render: (value: string) => <RelativeTime value={value} />,
      },
      {
        field: 'created_at',
        name: i18n.COLUMN_CREATED,
        sortable: true,
        width: '104px',
        render: (value: string) => <RelativeTime value={value} />,
      },
    ],
    []
  );

  const cappedTotal = Math.min(total, INVESTIGATION_LIMITS.maxDeepPageFrom);

  const handleChange = ({ page, sort }: CriteriaWithPagination<InvestigationRecord>) => {
    const sortChanged =
      sort && (sort.field !== state.sortField || sort.direction !== state.sortOrder);
    if (sortChanged) {
      onChange({ sortField: String(sort.field), sortOrder: sort.direction, pageIndex: 0 });
      return;
    }
    if (page.size !== state.pageSize) {
      onChange({ pageSize: page.size, pageIndex: 0 });
      return;
    }
    onChange({ pageIndex: page.index });
  };

  return (
    <div
      css={css`
        overflow-x: auto;
      `}
    >
      <EuiBasicTable<InvestigationRecord>
        tableCaption={i18n.TABLE_CAPTION}
        items={records}
        itemId="id"
        columns={columns}
        loading={isLoading}
        noItemsMessage={noItemsMessage}
        pagination={{
          pageIndex: state.pageIndex,
          pageSize: state.pageSize,
          totalItemCount: cappedTotal,
          pageSizeOptions: [...PAGE_SIZE_OPTIONS],
        }}
        sorting={{
          sort: { field: state.sortField as keyof InvestigationRecord, direction: state.sortOrder },
        }}
        onChange={handleChange}
        rowProps={(record) => ({ 'data-test-subj': `investigationRow-${record.display_id}` })}
        data-test-subj="investigationsQueueTable"
      />
    </div>
  );
};
QueueTable.displayName = 'QueueTable';
