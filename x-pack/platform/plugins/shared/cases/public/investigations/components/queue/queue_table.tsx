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

const truncateStyle = css`
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

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
        width: '116px',
        render: (_value: number, record) => (
          <span
            css={css`
              white-space: nowrap;
            `}
          >
            <RecordLink record={record}>{record.display_id}</RecordLink>
          </span>
        ),
      },
      {
        field: 'title.keyword',
        name: i18n.COLUMN_TITLE,
        sortable: true,
        truncateText: true,
        render: (_value: string, record) => {
          const unit = record.fields[BUSINESS_UNIT_FIELD_KEY];
          const secondary = [
            record.investigation_type,
            typeof unit === 'string' && unit.length > 0 ? unit : undefined,
          ]
            .filter(Boolean)
            .join(' \u00b7 ');
          return (
            <>
              <EuiToolTip content={record.title} anchorProps={{ css: truncateStyle }}>
                <RecordLink record={record}>{record.title}</RecordLink>
              </EuiToolTip>
              {secondary ? (
                <EuiText
                  size="xs"
                  color="subdued"
                  css={truncateStyle}
                  data-test-subj="investigationQueueTitleMeta"
                >
                  {secondary}
                </EuiText>
              ) : null}
            </>
          );
        },
      },
      {
        field: 'status',
        name: i18n.COLUMN_STATUS,
        sortable: true,
        width: '128px',
        render: (_value: string, record) => (
          <StatusBadge status={record.status} owner={record.owner} />
        ),
      },
      {
        field: 'priority',
        name: i18n.COLUMN_PRIORITY,
        sortable: true,
        width: '92px',
        render: (_value: string, record) => (
          <PriorityBadge priority={record.priority} note={record.priority_note} />
        ),
      },
      {
        field: 'owner',
        name: i18n.COLUMN_OWNER,
        width: '116px',
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
        width: '152px',
        render: (_value: unknown, record) => {
          const verdict = getEffectiveVerdict(record);
          if (verdict.source === null) {
            return (
              <EuiText size="s" color="subdued">
                {i18n.NO_VALUE}
              </EuiText>
            );
          }
          const text =
            verdict.source === 'agent'
              ? `${verdict.label} (${i18n.VERDICT_AGENT_SUFFIX})`
              : verdict.label;
          return (
            <EuiToolTip content={text} anchorProps={{ css: truncateStyle }}>
              <VerdictBadge
                label={verdict.label}
                verdict={verdict.classification}
                source={verdict.source}
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: 'counters.alerts',
        name: i18n.COLUMN_ALERTS,
        sortable: true,
        align: 'right',
        width: '78px',
        render: (_value: number, record) => record.counters.alerts,
      },
      {
        field: 'counters.evidence',
        name: i18n.COLUMN_EVIDENCE_CLAIMS,
        sortable: true,
        align: 'right',
        width: '140px',
        render: (_value: number, record) => (
          <span
            css={css`
              white-space: nowrap;
            `}
            data-test-subj="investigationQueueEvidenceClaims"
          >
            {i18n.EVIDENCE_CLAIMS(
              record.counters.evidence,
              record.counters.claims_by_status.open ?? 0
            )}
          </span>
        ),
      },
      {
        field: 'updated_at',
        name: i18n.COLUMN_UPDATED,
        sortable: true,
        width: '96px',
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
        max-width: 100%;
        overflow-x: auto;
      `}
    >
      <EuiBasicTable<InvestigationRecord>
        tableCaption={i18n.TABLE_CAPTION}
        tableLayout="fixed"
        responsiveBreakpoint="m"
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
