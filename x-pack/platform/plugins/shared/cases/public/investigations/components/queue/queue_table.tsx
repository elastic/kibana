/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import { getRecordStatus } from '../../../../common/investigations/statuses';
import type { CaseStatusConfiguration } from '../../../../common/investigations/statuses';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useInvestigationsNavigation } from '../../hooks';
import { ActorBadge } from '../shared/actor_badge';
import { PriorityBadge } from '../shared/priority_badge';
import { RelativeTime } from '../shared/relative_time';
import { VerdictBadge, getEffectiveVerdict } from '../shared/verdict_badge';
import { AgeCell } from './age_cell';
import { StatusCell } from './status_cell';
import * as i18n from './translations';
import { formatFieldValue } from './use_queue_fields';
import type { QueueFieldDef } from './use_queue_fields';
import { PAGE_SIZE_OPTIONS } from './use_queue_url_state';
import type { QueueState } from './use_queue_url_state';

export interface QueueTableProps {
  records: InvestigationRecord[];
  total: number;
  state: QueueState;
  isLoading: boolean;
  noItemsMessage: React.ReactNode;
  /** The configured statuses, to show each record's status label. */
  statuses: CaseStatusConfiguration[];
  /** Form fields shown as extra columns after the built-in ones. */
  fieldColumns: QueueFieldDef[];
  onChange: (change: Partial<QueueState>) => void;
  /** Row checkboxes are shown when this is given. */
  onSelectionChange?: (selected: InvestigationRecord[]) => void;
  selected?: InvestigationRecord[];
}

const NO_SELECTION: InvestigationRecord[] = [];

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
  statuses,
  fieldColumns,
  onChange,
  onSelectionChange,
  selected = NO_SELECTION,
}) => {
  const assigneeUids = useMemo(
    () => Array.from(new Set(records.flatMap((record) => record.assignees))),
    [records]
  );
  const { data: profiles } = useBulkGetUserProfiles({ uids: assigneeUids });

  const columns = useMemo<Array<EuiBasicTableColumn<InvestigationRecord>>>(
    () => [
      {
        field: 'display_num',
        name: i18n.COLUMN_ID,
        sortable: true,
        width: '100px',
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
          const secondary = record.investigation_type;
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
        width: '176px',
        render: (_value: string, record) => (
          <StatusCell record={record} status={getRecordStatus(statuses, record)} />
        ),
      },
      {
        field: 'priority',
        name: i18n.COLUMN_PRIORITY,
        sortable: true,
        width: '84px',
        render: (_value: string, record) => (
          <PriorityBadge priority={record.priority} note={record.priority_note} />
        ),
      },
      {
        field: 'owner',
        name: i18n.COLUMN_OWNER,
        width: '108px',
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
        field: 'assignees',
        name: i18n.COLUMN_ASSIGNEES,
        width: '92px',
        render: (_value: unknown, record) => {
          if (record.assignees.length === 0) {
            return (
              <EuiText size="s" color="subdued">
                {i18n.NO_VALUE}
              </EuiText>
            );
          }
          const shown = record.assignees.slice(0, 3);
          const hidden = record.assignees.length - shown.length;
          return (
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              responsive={false}
              data-test-subj={`investigationAssignees-${record.display_id}`}
            >
              {shown.map((uid) => {
                const profile = profiles?.get(uid);
                return (
                  <EuiFlexItem grow={false} key={uid}>
                    <EuiToolTip
                      content={profile ? getUserDisplayName(profile.user) : i18n.USER_UNKNOWN}
                    >
                      <span tabIndex={0}>
                        {profile ? (
                          <UserAvatar user={profile.user} avatar={profile.data.avatar} size="s" />
                        ) : (
                          <EuiBadge color="hollow">?</EuiBadge>
                        )}
                      </span>
                    </EuiToolTip>
                  </EuiFlexItem>
                );
              })}
              {hidden > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">{`+${hidden}`}</EuiText>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'verdict',
        name: i18n.COLUMN_VERDICT,
        width: '132px',
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
        width: '72px',
        render: (_value: number, record) => record.counters.alerts,
      },
      {
        field: 'counters.evidence',
        name: i18n.COLUMN_EVIDENCE_CLAIMS,
        sortable: true,
        align: 'right',
        width: '132px',
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
        field: 'created_at',
        name: i18n.COLUMN_AGE,
        width: '92px',
        render: (_value: string, record) => <AgeCell record={record} />,
      },
      {
        field: 'updated_at',
        name: i18n.COLUMN_UPDATED,
        sortable: true,
        width: '88px',
        render: (value: string) => <RelativeTime value={value} />,
      },
      ...fieldColumns.map(
        ({ mirrorKey, label }): EuiBasicTableColumn<InvestigationRecord> => ({
          field: `fields.${mirrorKey}`,
          name: label,
          sortable: true,
          truncateText: true,
          width: '140px',
          render: (_value: unknown, record) => {
            const text = formatFieldValue(
              record.fields[mirrorKey],
              i18n.FILTER_FIELDS_YES,
              i18n.FILTER_FIELDS_NO
            );
            return text === null ? (
              <EuiText size="s" color="subdued">
                {i18n.NO_VALUE}
              </EuiText>
            ) : (
              <span
                css={truncateStyle}
                title={text}
                data-test-subj={`investigationFieldCell-${mirrorKey}`}
              >
                {text}
              </span>
            );
          },
        })
      ),
    ],
    [fieldColumns, statuses, profiles]
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
        selection={onSelectionChange ? { selected, onSelectionChange } : undefined}
        rowProps={(record) => ({ 'data-test-subj': `investigationRow-${record.display_id}` })}
        data-test-subj="investigationsQueueTable"
      />
    </div>
  );
};
QueueTable.displayName = 'QueueTable';
