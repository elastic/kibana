/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostDataSource, BoostProfileType } from '../../../common/types';
import { formatSize } from '../cost_format';
import { DetailsSection } from '../details/details_page';
import { EmptyCell } from '../empty_cell';
import { formatCount } from '../format';
import { SupersedingRule, TargetName } from './target_name';

/** Whether the rule applies to a match, or a higher-ranked rule outranks it. */
type MatchStatus = 'applied' | 'outranked';

const STATUS_LABELS: Readonly<Record<MatchStatus, string>> = {
  applied: i18n.translate('xpack.boost.matchedTable.appliedFilter', { defaultMessage: 'Applied' }),
  outranked: i18n.translate('xpack.boost.matchedTable.outrankedFilter', {
    defaultMessage: 'Outranked',
  }),
};

const STATUSES: readonly MatchStatus[] = ['applied', 'outranked'];

interface MatchedTableProps {
  type?: BoostProfileType;
  /** What the rule matches, sorted by name. */
  matched: readonly BoostDataSource[];
  /** Matches that a higher-ranked rule applies to instead, with that rule's name. */
  supersededBy: ReadonlyMap<string, string>;
}

/**
 * The indices or data streams a rule matches, each linking to its details in Index Management. Those
 * a higher-ranked rule applies to instead are struck through, with that rule in a column that only
 * shows when there are any. A search box filters them by name, and a filter group by whether the
 * rule applies to them, with how many of the search results each would show.
 */
export const MatchedTable = ({ type, matched, supersededBy }: MatchedTableProps) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<MatchStatus>();
  const isDataStreams = type === 'data_streams';

  // Whether to show the column of rules that outrank matches, which the search doesn't change.
  const hasOutranked = matched.some(({ name }) => supersededBy.has(name));
  const getStatus = ({ name }: BoostDataSource): MatchStatus =>
    supersededBy.has(name) ? 'outranked' : 'applied';
  const normalizedQuery = query.trim().toLowerCase();
  const searched = matched.filter(({ name }) => name.toLowerCase().includes(normalizedQuery));
  // Each filter counts what it would show with the current search.
  const counts: Record<MatchStatus, number> = { applied: 0, outranked: 0 };
  searched.forEach((dataSource) => counts[getStatus(dataSource)]++);
  const items =
    status === undefined
      ? searched
      : searched.filter((dataSource) => getStatus(dataSource) === status);

  const searchLabel = isDataStreams
    ? i18n.translate('xpack.boost.matchedTable.searchDataStreams', {
        defaultMessage: 'Search data streams',
      })
    : i18n.translate('xpack.boost.matchedTable.searchIndices', {
        defaultMessage: 'Search indices',
      });

  const columns: Array<EuiBasicTableColumn<BoostDataSource>> = [
    {
      field: 'name',
      name: isDataStreams
        ? i18n.translate('xpack.boost.matchedTable.dataStreamColumn', {
            defaultMessage: 'Data stream',
          })
        : i18n.translate('xpack.boost.matchedTable.indexColumn', { defaultMessage: 'Index' }),
      sortable: true,
      render: (name: string, dataSource: BoostDataSource) => (
        <TargetName name={name} supersededBy={supersededBy.get(name)} linkedAs={dataSource.type} />
      ),
    },
    // Only when a higher-ranked rule applies to any of the matches instead, which it names.
    ...(hasOutranked
      ? [
          {
            name: i18n.translate('xpack.boost.matchedTable.outrankedByColumn', {
              defaultMessage: 'Outranked by rule',
            }),
            render: ({ name }: BoostDataSource) => {
              const supersedingRule = supersededBy.get(name);
              // The header says what the rule did, so it needs no icon for ranking higher.
              return supersedingRule ? (
                <SupersedingRule rule={supersedingRule} isLinked hasIcon={false} />
              ) : (
                <EmptyCell />
              );
            },
          },
        ]
      : []),
    {
      field: 'docs_count',
      name: i18n.translate('xpack.boost.matchedTable.docsCountColumn', {
        defaultMessage: 'Documents count',
      }),
      width: '13em',
      sortable: true,
      dataType: 'number',
      render: (count?: number) => (count === undefined ? <EmptyCell /> : formatCount(count)),
    },
    {
      field: 'size_in_bytes',
      name: i18n.translate('xpack.boost.matchedTable.sizeColumn', { defaultMessage: 'Size' }),
      width: '9em',
      sortable: true,
      dataType: 'number',
      render: formatSize,
    },
  ];

  return (
    <DetailsSection
      title={
        isDataStreams
          ? i18n.translate('xpack.boost.matchedTable.dataStreamsTitle', {
              defaultMessage: 'Matched data streams',
            })
          : i18n.translate('xpack.boost.matchedTable.indicesTitle', {
              defaultMessage: 'Matched indices',
            })
      }
      data-test-subj="boostRuleMatched"
    >
      {matched.length > 0 && (
        <>
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem css={{ minInlineSize: '12em' }}>
              <EuiFieldSearch
                compressed
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchLabel}
                aria-label={searchLabel}
                isClearable
                fullWidth
                data-test-subj="boostMatchedSearch"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup compressed>
                {STATUSES.map((item, index) => (
                  <EuiFilterButton
                    key={item}
                    isToggle
                    isSelected={status === item}
                    hasActiveFilters={status === item}
                    numFilters={counts[item]}
                    // A filter with nothing to show is off, unless it's on already.
                    isDisabled={counts[item] === 0 && status !== item}
                    withNext={index < STATUSES.length - 1}
                    onClick={() => setStatus(status === item ? undefined : item)}
                    data-test-subj={`boostMatchedFilter-${item}`}
                  >
                    {STATUS_LABELS[item]}
                  </EuiFilterButton>
                ))}
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiInMemoryTable
        tableCaption={i18n.translate('xpack.boost.matchedTable.caption', {
          defaultMessage: 'Indices or data streams this rule matches',
        })}
        items={items}
        columns={columns}
        sorting={{ sort: { field: 'name', direction: 'asc' } }}
        pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
        noItemsMessage={
          matched.length === 0
            ? i18n.translate('xpack.boost.matchedTable.noMatches', {
                defaultMessage: 'This rule matches nothing yet.',
              })
            : isDataStreams
            ? i18n.translate('xpack.boost.matchedTable.noDataStreamsFound', {
                defaultMessage: 'No data streams match your search or filter.',
              })
            : i18n.translate('xpack.boost.matchedTable.noIndicesFound', {
                defaultMessage: 'No indices match your search or filter.',
              })
        }
      />
    </DetailsSection>
  );
};
