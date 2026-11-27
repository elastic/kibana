/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useLatest from 'react-use/lib/useLatest';
import { EuiEmptyPrompt, useIsWithinMinBreakpoint } from '@elastic/eui';
import type { ActiveFilters, ContentListItem, FindItemsParams } from '@kbn/content-list-provider';
import { ContentListFooter, ContentListTable, ContentListToolbar } from '@kbn/content-list';
import { filter } from '@kbn/content-list-toolbar';
import type { LinkProps } from '../../types';
import type { BoostProfileType, BoostRuleMatch, DataRetention } from '../../../common/types';
import { InMemoryListProvider } from '../in_memory_list_provider';
import { ListLayout } from '../list_layout';
import { NameCell } from '../name_cell';
import { matchesIncludeExclude, matchesSearch } from '../list_matchers';
import { TableCount } from '../table_count';
import { OutrankedBy, OutrankedByHeader, RetentionValue, StorageSize } from './match_cells';
import type { MatchStatus } from './status_filter';
import {
  RowStatusesProvider,
  STATUS_FIELD,
  STATUS_FIELD_DEFINITION,
  StatusFilter,
} from './status_filter';
import {
  MATCHES_LABELS,
  NO_MATCHES_MESSAGE,
  RETENTION_COLUMN,
  STORAGE_SIZE_LABEL,
  formatTargetCount,
} from '../../translations';

const { Column } = ContentListTable;

type MatchItem = ContentListItem &
  BoostRuleMatch & {
    retentionOrder: number;
    status: MatchStatus;
  };

const FIELDS = [STATUS_FIELD_DEFINITION];

// Shorter retention first, then indefinitely, then disabled.
const getRetentionOrder = (retention?: DataRetention): number => {
  switch (retention?.type) {
    case 'value':
      return retention.inMilliseconds;
    case 'infinite':
      return Number.MAX_VALUE;
    case 'disabled':
      return Infinity;
    default:
      return -Infinity;
  }
};

const toItem = (match: BoostRuleMatch): MatchItem => ({
  ...match,
  id: match.name,
  title: match.name,
  retentionOrder: getRetentionOrder(match.retention),
  status: match.outrankedByRuleName ? 'outranked' : 'applied',
});

const summarizeMatches = (matches: BoostRuleMatch[]) => {
  const items: MatchItem[] = [];
  const itemsById = new Map<string, MatchItem>();
  let hasOutranked = false;
  let largestBytes = 0;
  for (const match of matches) {
    const item = toItem(match);
    items.push(item);
    itemsById.set(item.id, item);
    hasOutranked ||= Boolean(item.outrankedByRuleName);
    // A size that couldn't be loaded has no bar.
    if (item.storageSizeInBytes !== undefined) {
      largestBytes = Math.max(largestBytes, item.storageSizeInBytes);
    }
  }
  return { items, itemsById, hasOutranked, largestBytes };
};

const matchesFilters = (match: MatchItem, filters: ActiveFilters) =>
  matchesSearch(filters.search, [match.name]) &&
  matchesIncludeExclude(filters, STATUS_FIELD, match.status);

const matchesMatch = (match: MatchItem, { filters }: FindItemsParams) =>
  matchesFilters(match, filters);

// An empty `Filters` falls back to the default filters, such as the sort menu.
const SuppressDefaultFilters = filter.createComponent({ resolve: () => undefined });

export interface MatchesTableProps {
  type: BoostProfileType;
  /** Must keep its identity between renders, since a new array reloads the list. */
  matches: BoostRuleMatch[];
  queryKeyScope: string;
  /** Left out shows the names as plain text. */
  getMatchLinkProps?: (name: string) => LinkProps | undefined;
  getRuleLinkProps: (ruleName: string) => LinkProps;
  isOutrankingComputed?: boolean;
}

export const MatchesTable = ({
  type,
  matches,
  queryKeyScope,
  getMatchLinkProps,
  getRuleLinkProps,
  isOutrankingComputed = false,
}: MatchesTableProps) => {
  const labels = MATCHES_LABELS[type];
  const isWide = useIsWithinMinBreakpoint('l');

  const { items, itemsById, hasOutranked, largestBytes } = useMemo(
    () => summarizeMatches(matches),
    [matches]
  );
  const hasOutrankedColumn = isOutrankingComputed && hasOutranked;
  // Content List keeps the first render's cell renderers, so they read the latest values.
  const latest = useLatest({ itemsById, largestBytes, getMatchLinkProps, getRuleLinkProps });
  const getMatch = (item: ContentListItem) => latest.current.itemsById.get(item.id);
  const getRowStatuses = (filters: ActiveFilters) =>
    items.filter(({ name }) => matchesSearch(filters.search, [name])).map(({ status }) => status);

  return (
    <InMemoryListProvider
      items={items}
      queryKeyScope={queryKeyScope}
      labels={labels.list}
      matches={matchesMatch}
      fields={FIELDS}
    >
      <RowStatusesProvider value={getRowStatuses}>
        <ListLayout
          toolbar={
            <ContentListToolbar>
              <ContentListToolbar.Filters>
                {isOutrankingComputed ? <StatusFilter /> : <SuppressDefaultFilters />}
              </ContentListToolbar.Filters>
            </ContentListToolbar>
          }
          emptyState={
            <EuiEmptyPrompt body={NO_MATCHES_MESSAGE} data-test-subj="searchBoostMatchesEmpty" />
          }
          data-test-subj="searchBoostMatches"
        >
          <TableCount
            formatTotal={(count) => formatTargetCount(type, count)}
            data-test-subj="searchBoostMatchesCount"
          />
          <ContentListTable
            // Content List keeps its first columns, so a change of columns remounts the table.
            key={`${hasOutrankedColumn}-${isWide}`}
            title={labels.title}
            noItemsMessage={labels.noSearchMatches}
            data-test-subj="searchBoostMatchesTable"
          >
            <Column.Name
              columnTitle={labels.name}
              render={(item) => {
                const match = getMatch(item);
                return (
                  match && (
                    <NameCell
                      name={match.name}
                      linkProps={latest.current.getMatchLinkProps?.(match.name)}
                      isStruckThrough={Boolean(match.outrankedByRuleName)}
                      data-test-subj="searchBoostMatchName"
                    />
                  )
                );
              }}
            />
            {hasOutrankedColumn && (
              <Column
                id="outrankedBy"
                name={<OutrankedByHeader />}
                width="16em"
                render={(item) => (
                  <OutrankedBy
                    ruleName={getMatch(item)?.outrankedByRuleName}
                    getRuleLinkProps={latest.current.getRuleLinkProps}
                  />
                )}
              />
            )}
            {type === 'data_streams' && (
              <Column
                id="retentionOrder"
                name={RETENTION_COLUMN}
                width="10em"
                sortable
                render={(item) => <RetentionValue retention={getMatch(item)?.retention} />}
              />
            )}
            <Column
              id="storageSizeInBytes"
              name={STORAGE_SIZE_LABEL}
              width={isWide ? '16em' : '8em'}
              sortable
              render={(item) => {
                const match = getMatch(item);
                return (
                  <StorageSize
                    bytes={match?.storageSizeInBytes}
                    largestBytes={latest.current.largestBytes}
                    showsBar={isWide}
                    isOutranked={Boolean(match?.outrankedByRuleName)}
                  />
                );
              }}
            />
          </ContentListTable>
          <ContentListFooter />
        </ListLayout>
      </RowStatusesProvider>
    </InMemoryListProvider>
  );
};
