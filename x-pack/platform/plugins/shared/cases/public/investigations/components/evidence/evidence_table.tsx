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
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import { EVIDENCE_TYPE_LABELS } from '../../../../common/investigations/types';
import type { ClaimItem, EvidenceItem } from '../../../../common/investigations/types';
import { EVIDENCE_TYPE_ICONS, ICONS } from '../../icons';
import { ActorBadge } from '../shared/actor_badge';
import { formatAbsoluteUtc, formatRelativeTime } from '../shared/formatters';
import { useNow } from '../shared/use_now';
import { SeenElsewhereCell } from './seen_elsewhere';
import { useIndicatorTypes } from './use_indicator_types';
import type { SeenElsewhereInfo } from './seen_elsewhere';
import { EVIDENCE_PAGE_SIZE_OPTIONS } from './evidence_state';
import type { EvidenceSortKey, EvidenceState } from './evidence_state';
import * as i18n from './translations';

const isSortKey = (value: string): value is EvidenceSortKey =>
  value === 'ref' || value === 'title' || value === 'type' || value === 'created_at';

export interface EvidenceTableProps {
  items: EvidenceItem[];
  total: number;
  state: EvidenceState;
  isLoading: boolean;
  noItemsMessage: React.ReactNode;
  selected: EvidenceItem[];
  onSelectionChange: (selected: EvidenceItem[]) => void;
  onChange: (change: Partial<EvidenceState>) => void;
  onOpen: (itemId: string, tab?: 'comments') => void;
  openItemId: string | undefined;
  /** Lowercased indicator value to the other investigations that hold it. */
  seenByValue: Map<string, SeenElsewhereInfo>;
  claimsByEvidenceId: Map<string, ClaimItem[]>;
  commentCounts: Map<string, number>;
  commentCountsExact?: boolean;
  onOpenClaim: (claimId: string) => void;
}

const MAX_USED_IN_BADGES = 1;

const clampStyle = (lines: number): string => `
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  overflow: hidden;
`;

const INTERACTIVE_SELECTOR = 'input, button, a, label, [role="checkbox"], [role="button"]';

export const EvidenceTable: React.FC<EvidenceTableProps> = ({
  items,
  total,
  state,
  isLoading,
  noItemsMessage,
  selected,
  onSelectionChange,
  onChange,
  onOpen,
  openItemId,
  seenByValue,
  claimsByEvidenceId,
  commentCounts,
  onOpenClaim,
}) => {
  const { euiTheme } = useEuiTheme();
  const { getLabel: getIndicatorTypeLabel } = useIndicatorTypes();

  const now = useNow();

  const columns = useMemo<Array<EuiBasicTableColumn<EvidenceItem>>>(
    () => [
      {
        field: 'ref',
        name: i18n.COLUMN_ID,
        sortable: true,
        width: '76px',
        render: (_value: string, item) => (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
            <EuiFlexItem grow={false}>
              <EuiLink
                onClick={() => onOpen(item.id)}
                data-test-subj={`investigationEvidenceRef-${item.ref}`}
              >
                {item.ref}
              </EuiLink>
            </EuiFlexItem>
            {item.evidence.snapshot_hash ? (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type={ICONS.preserved}
                  size="s"
                  content={i18n.PRESERVED_TOOLTIP(item.evidence.snapshot_hash)}
                  aria-label={i18n.PRESERVED_ARIA(item.ref)}
                  iconProps={{ tabIndex: -1 }}
                  data-test-subj={`investigationEvidencePreserved-${item.ref}`}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'type',
        name: i18n.COLUMN_TYPE,
        sortable: true,
        width: '108px',
        render: (_value: string, item) => (
          <div>
            <EuiBadge color="hollow" iconType={EVIDENCE_TYPE_ICONS[item.evidence.type]}>
              {EVIDENCE_TYPE_LABELS[item.evidence.type]}
            </EuiBadge>
            {item.evidence.indicator ? (
              <EuiText
                size="xs"
                color="subdued"
                css={css`
                  margin-block-start: ${euiTheme.size.xxs};
                `}
              >
                {getIndicatorTypeLabel(item.evidence.indicator.type)}
              </EuiText>
            ) : null}
            {item.evidence.source_expired ? (
              <EuiText
                size="xs"
                color="warning"
                css={css`
                  margin-block-start: ${euiTheme.size.xxs};
                `}
              >
                {i18n.SOURCE_EXPIRED}
              </EuiText>
            ) : null}
          </div>
        ),
      },
      {
        field: 'title',
        name: i18n.COLUMN_EVIDENCE,
        sortable: true,
        render: (_value: string, item) => (
          <div>
            <EuiText
              size="s"
              css={css`
                overflow-wrap: anywhere;
                ${clampStyle(2)}
                ${item.evidence.indicator ? `font-family: ${euiTheme.font.familyCode};` : ''}
              `}
              title={item.title}
              data-test-subj={`investigationEvidenceTitle-${item.ref}`}
            >
              {item.title}
            </EuiText>
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                overflow-wrap: anywhere;
                margin-block-start: ${euiTheme.size.xxs};
                ${clampStyle(1)}
              `}
              data-test-subj={`investigationEvidenceSource-${item.ref}`}
            >
              {item.evidence.source.label}
            </EuiText>
            {item.evidence.why ? (
              <EuiText
                size="xs"
                color="subdued"
                css={css`
                  overflow-wrap: anywhere;
                  margin-block-start: ${euiTheme.size.xxs};
                  ${clampStyle(2)}
                `}
                title={item.evidence.why}
              >
                {item.evidence.why}
              </EuiText>
            ) : null}
          </div>
        ),
      },
      {
        field: 'created_at',
        name: i18n.COLUMN_ADDED,
        sortable: true,
        width: '128px',
        render: (value: string, item) => (
          <div>
            <ActorBadge actor={item.created_by} compact />
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                margin-block-start: ${euiTheme.size.xxs};
              `}
            >
              <time
                dateTime={value}
                title={formatAbsoluteUtc(value)}
                data-test-subj="investigationEvidenceAddedAt"
              >
                {formatRelativeTime(value, now)}
              </time>
            </EuiText>
          </div>
        ),
      },
      {
        field: 'comments',
        name: (
          <EuiIcon
            type={ICONS.conversation}
            aria-label={i18n.COLUMN_COMMENTS}
            data-test-subj="investigationEvidenceCommentsHeader"
          />
        ),
        description: i18n.COLUMN_COMMENTS,
        width: '56px',
        render: (_value: unknown, item) => {
          const count = commentCounts.get(item.id) ?? 0;
          const label = count > 0 ? String(count) : '';
          return (
            <EuiButtonEmpty
              size="xs"
              flush="both"
              iconType={ICONS.conversation}
              aria-label={i18n.COMMENTS_ON(count, item.ref)}
              onClick={() => onOpen(item.id, 'comments')}
              data-test-subj={`investigationEvidenceComments-${item.ref}`}
            >
              {label}
            </EuiButtonEmpty>
          );
        },
      },
      {
        field: 'seen',
        name: i18n.COLUMN_SEEN_IN,
        description: i18n.COLUMN_SEEN_ELSEWHERE,
        width: '84px',
        render: (_value: unknown, item) =>
          item.evidence.indicator ? (
            <SeenElsewhereCell
              info={seenByValue.get(item.evidence.indicator.value.toLowerCase())}
              compact
            />
          ) : (
            <EuiText size="s" color="subdued">
              {i18n.NO_VALUE}
            </EuiText>
          ),
      },
      {
        field: 'used_in',
        name: i18n.COLUMN_USED_IN,
        width: '76px',
        render: (_value: unknown, item) => {
          const claims = claimsByEvidenceId.get(item.id) ?? [];
          if (claims.length === 0) {
            return (
              <EuiText size="s" color="subdued" title={i18n.NOT_LINKED}>
                {i18n.NO_VALUE}
              </EuiText>
            );
          }
          const shown = claims.slice(0, MAX_USED_IN_BADGES);
          const hidden = claims.length - shown.length;
          return (
            <span>
              {shown.map((claim) => (
                <EuiBadge
                  key={claim.id}
                  color="hollow"
                  onClick={() => onOpenClaim(claim.id)}
                  onClickAriaLabel={i18n.OPEN_CLAIM(claim.ref)}
                  data-test-subj={`investigationEvidenceUsedIn-${item.ref}-${claim.ref}`}
                >
                  {claim.ref}
                </EuiBadge>
              ))}
              {hidden > 0 ? (
                <EuiText size="xs" color="subdued" component="span">
                  {i18n.USED_IN_MORE(hidden)}
                </EuiText>
              ) : null}
            </span>
          );
        },
      },
    ],
    [
      claimsByEvidenceId,
      commentCounts,
      euiTheme.font.familyCode,
      euiTheme.size.xxs,
      getIndicatorTypeLabel,
      now,
      onOpen,
      onOpenClaim,
      seenByValue,
    ]
  );

  const handleChange = ({ page, sort }: CriteriaWithPagination<EvidenceItem>) => {
    if (sort && isSortKey(String(sort.field))) {
      const sortKey = String(sort.field) as EvidenceSortKey;
      if (sortKey !== state.sortKey || sort.direction !== state.sortOrder) {
        onChange({ sortKey, sortOrder: sort.direction, pageIndex: 0 });
        return;
      }
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
      <EuiBasicTable<EvidenceItem>
        tableCaption={i18n.TABLE_CAPTION}
        items={items}
        itemId="id"
        columns={columns}
        loading={isLoading}
        noItemsMessage={noItemsMessage}
        selection={{
          selected,
          onSelectionChange,
          selectableMessage: () => '',
        }}
        pagination={{
          pageIndex: state.pageIndex,
          pageSize: state.pageSize,
          totalItemCount: total,
          pageSizeOptions: [...EVIDENCE_PAGE_SIZE_OPTIONS],
        }}
        sorting={{
          sort: { field: state.sortKey as keyof EvidenceItem, direction: state.sortOrder },
        }}
        onChange={handleChange}
        rowProps={(item) => ({
          'data-test-subj': `investigationEvidenceRow-${item.ref}`,
          tabIndex: 0,
          isSelected: item.id === openItemId || selected.some(({ id }) => id === item.id),
          onClick: (event: React.MouseEvent<HTMLElement>) => {
            const target = event.target;
            if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR)) {
              return;
            }
            onOpen(item.id);
          },
          onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
            if (event.key === 'Enter' && event.target === event.currentTarget) {
              onOpen(item.id);
            }
          },
        })}
        data-test-subj="investigationEvidenceTable"
      />
    </div>
  );
};
EvidenceTable.displayName = 'EvidenceTable';
