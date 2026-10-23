/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiInMemoryTable,
  EuiProgress,
  EuiScreenReaderOnly,
  EuiSpacer,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  BoostDataLifecycle,
  BoostDataSource,
  BoostProfile,
  BoostProfileType,
} from '../../../common/types';
import { parseMaxAge, toMaxAgeHours } from '../../../common/validation';
import { estimateDataSourceVcuRange } from '../../../common/vcu_estimate';
import { formatCost, formatSize, roundVcus } from '../cost_format';
import { DetailsLink } from '../details_link';
import { DetailsSection } from '../details/details_page';
import { TableCount } from '../details/table_count';
import { useTablePage } from '../use_table_page';
import { useShowsEstimates } from '../../prototype/estimates_setting';
import { EmptyCell } from '../empty_cell';
import { formatDataSourceCount, formatMaxAge } from '../format';
import { TargetName } from './target_name';

/** Whether the rule applies to a match, or a higher-ranked rule outranks it. */
type MatchStatus = 'applied' | 'outranked';

const STATUS_LABELS: Readonly<Record<MatchStatus, string>> = {
  applied: i18n.translate('xpack.boost.matchedTable.appliedFilter', { defaultMessage: 'Applied' }),
  outranked: i18n.translate('xpack.boost.matchedTable.outrankedFilter', {
    defaultMessage: 'Outranked',
  }),
};

const STATUSES: readonly MatchStatus[] = ['applied', 'outranked'];

/** A match, with what its columns show and sort by beyond the data source itself. */
interface MatchedRow extends BoostDataSource {
  /** The higher-ranked rule that applies to it instead, if any. */
  outrankedBy?: string;
  /** Its search VCUs under the rule's profile, unless a higher-ranked rule applies instead. */
  restVcus?: number;
  peakVcus?: number;
  /** How long it keeps data, in hours, or infinite when indefinitely. */
  retentionHours?: number;
}

const getRetentionHours = (lifecycle: BoostDataLifecycle | undefined): number | undefined => {
  if (!lifecycle?.enabled) {
    return undefined;
  }
  if (lifecycle.data_retention === undefined) {
    return Number.POSITIVE_INFINITY;
  }
  const retention = parseMaxAge(lifecycle.data_retention);
  return retention && toMaxAgeHours(retention);
};

const renderRetention = (lifecycle: BoostDataLifecycle | undefined) => {
  if (!lifecycle) {
    return <EmptyCell />;
  }
  if (!lifecycle.enabled) {
    return i18n.translate('xpack.boost.matchedTable.retentionDisabled', {
      defaultMessage: 'Disabled',
    });
  }
  // As in Index Management.
  if (lifecycle.data_retention === undefined) {
    return (
      <EuiIconTip
        type="infinity"
        position="top"
        content={i18n.translate('xpack.boost.matchedTable.retentionIndefinite', {
          defaultMessage: 'Keep data indefinitely',
        })}
      />
    );
  }
  return formatMaxAge(lifecycle.data_retention) ?? lifecycle.data_retention;
};

/**
 * A column's name, with an icon whose tooltip explains it. A sortable column's name sits in its
 * sort button, which can't hold anything focusable, so screen readers read the explanation as the
 * icon's label instead.
 */
const ColumnName = ({ name, tip }: { name: string; tip: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <span css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.xs }}>
      {name}
      {/* Without a color, the icon takes the header's, including its sort button's on hover. */}
      <EuiIconTip
        type="info"
        size="s"
        // A flex anchor sizes to the icon, so the name's flex alignment centers it. The default
        // inline-block anchor gets a line box from the inherited font, which offsets the icon.
        display="flex"
        content={tip}
        aria-label={tip}
        disableScreenReaderOutput
        // Not focusable, since it's in the sort button, which takes the focus.
        iconProps={{ tabIndex: undefined }}
      />
    </span>
  );
};

// The table keeps track of its sorted column by its name, so names with an icon are created once,
// rather than on each render, which would lose the sort.
const OUTRANKED_BY_NAME = (
  <ColumnName
    name={i18n.translate('xpack.boost.matchedTable.outrankedByColumn', {
      defaultMessage: 'Outranked by rule',
    })}
    tip={i18n.translate('xpack.boost.matchedTable.outrankedByTooltip', {
      defaultMessage:
        'A higher-ranked rule that applies to the match instead. To outrank it, increase this rule’s priority.',
    })}
  />
);

const REST_COST_NAME = (
  <ColumnName
    name={i18n.translate('xpack.boost.matchedTable.restCostColumn', {
      defaultMessage: 'Cost at rest',
    })}
    tip={i18n.translate('xpack.boost.matchedTable.restCostTooltip', {
      defaultMessage:
        'Estimated search cost per hour at the minimum boost of this rule’s profile, with little search load.',
    })}
  />
);

const PEAK_COST_NAME = (
  <ColumnName
    name={i18n.translate('xpack.boost.matchedTable.peakCostColumn', {
      defaultMessage: 'Cost at peak',
    })}
    tip={i18n.translate('xpack.boost.matchedTable.peakCostTooltip', {
      defaultMessage:
        'Estimated search cost per hour at the maximum boost of this rule’s profile, under peak search load.',
    })}
  />
);

// The size bars' width, in rem, so the column fits it whatever the text size around it.
const SIZE_BAR_WIDTH = '5rem';

// The table width, in pixels, from which the size bars' column leaves enough room for most names on
// one line beside the other columns.
const SIZE_BARS_MIN_TABLE_WIDTH = 1050;

// The size bars' column has no visible header, as the bars sit beside the sizes they chart.
const SIZE_BAR_NAME = (
  <EuiScreenReaderOnly>
    <span>
      {i18n.translate('xpack.boost.matchedTable.sizeBarColumn', {
        defaultMessage: 'Storage size compared with the largest match',
      })}
    </span>
  </EuiScreenReaderOnly>
);

interface SizeBarProps {
  bytes: number;
  /** The largest match's size, which fills the bar. */
  maxBytes: number;
  isOutranked: boolean;
}

/**
 * A bar scaled to the largest match's size, so sizes compare at a glance. An outranked match's bar
 * takes the disabled color of its struck-through name, so it recedes.
 */
const SizeBar = ({ bytes, maxBytes, isOutranked }: SizeBarProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiProgress
      value={bytes}
      max={maxBytes > 0 ? maxBytes : 1}
      size="s"
      color={isOutranked ? euiTheme.colors.textDisabled : 'primary'}
      css={{ inlineSize: SIZE_BAR_WIDTH }}
    />
  );
};

// Outranked matches cost this rule nothing, so they have no cost.
const renderCost = (vcus: number | undefined) =>
  vcus === undefined ? <EmptyCell /> : formatCost(roundVcus(vcus));

interface MatchedTableProps {
  type?: BoostProfileType;
  /** The rule's profile, which its search cost estimates use. */
  profile?: BoostProfile;
  /** What the rule matches, sorted by name. */
  matched: readonly BoostDataSource[];
  /** Matches that a higher-ranked rule applies to instead, with that rule's name. */
  supersededBy: ReadonlyMap<string, string>;
}

/**
 * The indices or data streams a rule matches, each linking to its details in Index Management, with
 * a data stream's retention, and each match's data and search cost at rest and at peak. Those a higher-ranked rule
 * applies to instead are struck through, with that rule in a column that only shows when there are
 * any. A search box filters them by name, and a filter group by whether the rule applies to them,
 * with how many of the search results each would show.
 */
export const MatchedTable = ({ type, profile, matched, supersededBy }: MatchedTableProps) => {
  const { euiTheme } = useEuiTheme();
  const showsEstimates = useShowsEstimates();
  // The size bars only add a glance at the sizes beside them, so a narrower table gives their space
  // to the other columns. The table's width decides, rather than the screen's, since Kibana's
  // navigation takes more or less of the screen.
  const [tableWrapper, setTableWrapper] = useState<HTMLDivElement | null>(null);
  const { width: tableWidth } = useResizeObserver(tableWrapper, 'width');
  const showsSizeBars = tableWidth >= SIZE_BARS_MIN_TABLE_WIDTH;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<MatchStatus>();
  const isDataStreams = type === 'data_streams';

  const rows = useMemo(
    () =>
      matched.map((dataSource): MatchedRow => {
        const outrankedBy = supersededBy.get(dataSource.name);
        const vcus =
          profile && outrankedBy === undefined
            ? estimateDataSourceVcuRange(dataSource, profile)
            : undefined;
        return {
          ...dataSource,
          outrankedBy,
          restVcus: vcus?.atRest,
          peakVcus: vcus?.atPeak,
          retentionHours: getRetentionHours(dataSource.lifecycle),
        };
      }),
    [matched, supersededBy, profile]
  );
  // The largest match fills its size bar; the search doesn't change it, so bars keep their scale.
  const maxBytes = Math.max(0, ...rows.map(({ size_in_bytes: bytes }) => bytes));
  // Whether to show the column of rules that outrank matches, which the search doesn't change.
  const hasOutranked = rows.some(({ outrankedBy }) => outrankedBy !== undefined);
  const getStatus = ({ outrankedBy }: MatchedRow): MatchStatus =>
    outrankedBy === undefined ? 'applied' : 'outranked';
  const normalizedQuery = query.trim().toLowerCase();
  const searched = rows.filter(({ name }) => name.toLowerCase().includes(normalizedQuery));
  // Each filter counts what it would show with the current search.
  const counts: Record<MatchStatus, number> = { applied: 0, outranked: 0 };
  searched.forEach((dataSource) => counts[getStatus(dataSource)]++);
  const items =
    status === undefined
      ? searched
      : searched.filter((dataSource) => getStatus(dataSource) === status);

  // A new search or filter starts again at the first page.
  const { pageIndex, pageSize, pagination, onTableChange } = useTablePage<MatchedRow>(
    `${query}|${status}`,
    items.length
  );

  const searchLabel = isDataStreams
    ? i18n.translate('xpack.boost.matchedTable.searchDataStreams', {
        defaultMessage: 'Search data streams',
      })
    : i18n.translate('xpack.boost.matchedTable.searchIndices', {
        defaultMessage: 'Search indices',
      });

  const columns: Array<EuiBasicTableColumn<MatchedRow>> = [
    {
      field: 'name',
      name: isDataStreams
        ? i18n.translate('xpack.boost.matchedTable.dataStreamColumn', {
            defaultMessage: 'Data stream',
          })
        : i18n.translate('xpack.boost.matchedTable.indexColumn', { defaultMessage: 'Index' }),
      sortable: true,
      render: (name: string, { type: dataSourceType, outrankedBy }: MatchedRow) => (
        <TargetName name={name} supersededBy={outrankedBy} linkedAs={dataSourceType} />
      ),
    },
    // Only when a higher-ranked rule applies to any of the matches instead, which it names. Like
    // the columns below, matches without a value sort last, whichever the direction.
    ...(hasOutranked
      ? [
          {
            field: 'outrankedBy',
            name: OUTRANKED_BY_NAME,
            sortable: true,
            render: (outrankedBy?: string) =>
              outrankedBy ? (
                <DetailsLink kind="rule" name={outrankedBy} data-test-subj="boostSupersedingRule" />
              ) : (
                <EmptyCell />
              ),
          },
        ]
      : []),
    ...(isDataStreams
      ? [
          {
            field: 'retentionHours',
            name: i18n.translate('xpack.boost.matchedTable.retentionColumn', {
              defaultMessage: 'Data retention',
            }),
            width: '10em',
            sortable: true,
            render: (_hours: number | undefined, { lifecycle }: MatchedRow) =>
              renderRetention(lifecycle),
          },
        ]
      : []),
    {
      field: 'size_in_bytes',
      name: i18n.translate('xpack.boost.matchedTable.storageSizeColumn', {
        defaultMessage: 'Storage size',
      }),
      width: '9em',
      sortable: true,
      dataType: 'number',
      render: formatSize,
    },
    // Each size's bar, in a column of its own beside the right-aligned sizes, when the table is wide
    // enough to spare it.
    ...(showsSizeBars
      ? [
          {
            name: SIZE_BAR_NAME,
            // The bar's width, and the cell's padding on either side.
            width: `calc(${SIZE_BAR_WIDTH} + ${euiTheme.size.base})`,
            render: ({ size_in_bytes: bytes, outrankedBy }: MatchedRow) => (
              <SizeBar bytes={bytes} maxBytes={maxBytes} isOutranked={outrankedBy !== undefined} />
            ),
          },
        ]
      : []),
    // Only while the prototype shows estimates, which testers can turn off.
    ...(profile && showsEstimates
      ? [
          {
            field: 'restVcus',
            name: REST_COST_NAME,
            width: '12em',
            sortable: true,
            dataType: 'number' as const,
            render: renderCost,
          },
          {
            field: 'peakVcus',
            name: PEAK_COST_NAME,
            width: '12em',
            sortable: true,
            dataType: 'number' as const,
            render: renderCost,
          },
        ]
      : []),
  ];

  // Above the table: the search, and the filters whose counts follow it.
  const toolbar = (
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
  );

  return (
    <DetailsSection
      title={
        isDataStreams
          ? i18n.translate('xpack.boost.matchedTable.dataStreamsTitle', {
              defaultMessage: 'Matching data streams',
            })
          : i18n.translate('xpack.boost.matchedTable.indicesTitle', {
              defaultMessage: 'Matching indices',
            })
      }
      data-test-subj="boostRuleMatched"
    >
      {matched.length > 0 && (
        <>
          {toolbar}
          <EuiSpacer size="s" />
          <TableCount
            pageIndex={pageIndex}
            pageSize={pageSize}
            total={items.length}
            formatTotal={(count) => formatDataSourceCount(type, count)}
            data-test-subj="boostMatchedCount"
          />
        </>
      )}
      <div ref={setTableWrapper}>
        <EuiInMemoryTable
          tableCaption={i18n.translate('xpack.boost.matchedTable.caption', {
            defaultMessage: 'Indices or data streams this rule matches',
          })}
          items={items}
          columns={columns}
          sorting={{ sort: { field: 'name', direction: 'asc' } }}
          // The page is tracked here, for the count above the table.
          pagination={pagination}
          onTableChange={onTableChange}
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
      </div>
    </DetailsSection>
  );
};
