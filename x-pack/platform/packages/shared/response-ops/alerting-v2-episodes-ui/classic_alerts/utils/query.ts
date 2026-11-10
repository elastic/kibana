/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import dateMath from '@kbn/datemath';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_DELAYED,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { EPISODE_SOURCE_FILTER_CLASSIC } from '@kbn/alerting-v2-common-queries';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodesFilterState, EpisodesSortState } from '../../queries/episodes_query';
import {
  EPISODE_SEVERITIES,
  EPISODE_SEVERITY_FILTER_NONE,
  EPISODE_SEVERITY_SORT_RANK,
} from '../../components/severity/severity_utils';
import type { SeverityExtension } from '../../types/episode_data_source';
import type { TimeBucket } from '../../utils/histogram_utils';
import { HISTOGRAM_MAX_BREAKDOWN_SERIES, HISTOGRAM_UNKNOWN_BREAKDOWN } from '../../constants';
import { mapClassicStatusToEpisodeStatus } from './map_alert';

export interface ClassicAlertsTimeRange {
  from: string;
  to: string;
}

const MATCH_NONE: estypes.QueryDslQueryContainer = { bool: { must_not: { match_all: {} } } };

/**
 * Maps the v2 episode status filter values onto the classic `kibana.alert.status`
 * values: `active` -> `active`, `inactive` -> `recovered` | `untracked`. Other
 * episode statuses (pending / recovering) have no classic equivalent.
 */
const mapEpisodeStatusesToClassic = (statuses: string[]): string[] => {
  const mapped = new Set<string>();
  for (const status of statuses) {
    if (status === ALERT_EPISODE_STATUS.ACTIVE) {
      mapped.add(ALERT_STATUS_ACTIVE);
    } else if (status === ALERT_EPISODE_STATUS.INACTIVE) {
      mapped.add(ALERT_STATUS_RECOVERED);
      mapped.add(ALERT_STATUS_UNTRACKED);
    }
  }
  return [...mapped];
};

const buildSeverityFilter = (severities: string[]): estypes.QueryDslQueryContainer => {
  const values = severities
    .filter((severity) => severity !== EPISODE_SEVERITY_FILTER_NONE)
    .map((severity) => severity.toLowerCase());
  const includeNoSeverity = severities.includes(EPISODE_SEVERITY_FILTER_NONE);

  const should: estypes.QueryDslQueryContainer[] = [];
  if (values.length) {
    should.push({ terms: { [ALERT_SEVERITY]: values } });
  }
  if (includeNoSeverity) {
    should.push({ bool: { must_not: { exists: { field: ALERT_SEVERITY } } } });
  }
  if (!should.length) {
    return MATCH_NONE;
  }
  return { bool: { should, minimum_should_match: 1 } };
};

const buildTimeRangeFilter = (
  timeRange?: ClassicAlertsTimeRange
): estypes.QueryDslQueryContainer | undefined => {
  if (!timeRange) {
    return undefined;
  }
  const gte = dateMath.parse(timeRange.from)?.toISOString();
  const lte = dateMath.parse(timeRange.to, { roundUp: true })?.toISOString();
  if (!gte && !lte) {
    return undefined;
  }
  return {
    range: {
      [TIMESTAMP]: {
        ...(gte ? { gte } : {}),
        ...(lte ? { lte } : {}),
      },
    },
  };
};

/**
 * Translates the shared episodes filter state (plus time range) into an ES DSL
 * query for classic alerts. Filters without a classic equivalent (assignee, or a
 * source selection that does not include Classic) intentionally exclude all
 * classic rows.
 *
 * The authorized RAC alerts API adds the space + authorization filter on top of
 * this query, so this builder never needs to scope by space itself.
 */
export const buildClassicAlertsQuery = (
  filterState?: EpisodesFilterState,
  timeRange?: ClassicAlertsTimeRange
): estypes.QueryDslQueryContainer => {
  const filters: estypes.QueryDslQueryContainer[] = [];

  const timeRangeFilter = buildTimeRangeFilter(timeRange);
  if (timeRangeFilter) {
    filters.push(timeRangeFilter);
  }

  const trimmedSearch = filterState?.queryString?.trim();
  if (trimmedSearch) {
    filters.push(toElasticsearchQuery(fromKueryExpression(trimmedSearch)));
  }

  if (filterState?.status?.length) {
    const classicStatuses = mapEpisodeStatusesToClassic(filterState.status);
    filters.push(
      classicStatuses.length ? { terms: { [ALERT_STATUS]: classicStatuses } } : MATCH_NONE
    );
  }

  if (filterState?.ruleId) {
    filters.push({ term: { [ALERT_RULE_UUID]: filterState.ruleId } });
  }

  if (filterState?.groupHash) {
    filters.push({ term: { [ALERT_UUID]: filterState.groupHash } });
  }

  const tags = filterState?.tags?.map((tag) => tag.trim()).filter(Boolean);
  if (tags?.length) {
    filters.push({ terms: { [ALERT_WORKFLOW_TAGS]: tags } });
  }

  if (filterState?.severity?.length) {
    filters.push(buildSeverityFilter(filterState.severity));
  }

  if (filterState?.assigneeUid) {
    filters.push(MATCH_NONE);
  }

  if (
    filterState?.sources?.length &&
    !filterState.sources.includes(EPISODE_SOURCE_FILTER_CLASSIC)
  ) {
    filters.push(MATCH_NONE);
  }

  filters.push({
    bool: { must_not: { term: { [ALERT_STATUS]: ALERT_STATUS_DELAYED } } },
  });

  return { bool: { filter: filters } };
};

const SORT_FIELD_MAP: Record<string, string> = {
  '@timestamp': TIMESTAMP,
  'episode.id': ALERT_UUID,
  'episode.status': ALERT_STATUS,
  'rule.id': ALERT_RULE_UUID,
  duration: ALERT_DURATION,
};

const buildSeveritySortScript = (extensions: SeverityExtension[] = []): string =>
  [
    `def v = doc.containsKey('${ALERT_SEVERITY}') && !doc['${ALERT_SEVERITY}'].empty ? doc['${ALERT_SEVERITY}'].value : '';`,
    ...EPISODE_SEVERITIES.map(
      (s) => `if (v == '${s}') { return ${EPISODE_SEVERITY_SORT_RANK[s]}; }`
    ),
    ...extensions.map((ext) => `if (v == '${ext.value}') { return ${ext.sortRank}; }`),
    `return -1;`,
  ].join(' ');

export const buildClassicAlertsSort = (
  sortState?: EpisodesSortState,
  severityExtensions?: SeverityExtension[]
): estypes.SortOptions[] => {
  const order = sortState?.sortDirection === 'asc' ? 'asc' : 'desc';

  if (sortState?.sortField === 'severity') {
    return [
      {
        _script: {
          type: 'number',
          script: { source: buildSeveritySortScript(severityExtensions), lang: 'painless' },
          order,
        },
      },
      { [TIMESTAMP]: { order, unmapped_type: 'keyword' } },
    ];
  }

  const field = (sortState && SORT_FIELD_MAP[sortState.sortField]) ?? TIMESTAMP;
  return [{ [field]: { order, unmapped_type: 'keyword' } }];
};

export interface ClassicHistogramBreakdown {
  field: string;
  missing: string;
  normalize: (value: string) => string;
}

const identity = (value: string): string => value;

/** Maps v2 histogram breakdown fields onto the classic alert field and value normalisation. */
const CLASSIC_HISTOGRAM_BREAKDOWNS: Readonly<Record<string, ClassicHistogramBreakdown>> = {
  'episode.status': {
    field: ALERT_STATUS,
    missing: HISTOGRAM_UNKNOWN_BREAKDOWN,
    normalize: mapClassicStatusToEpisodeStatus,
  },
  'rule.id': {
    field: ALERT_RULE_UUID,
    missing: HISTOGRAM_UNKNOWN_BREAKDOWN,
    normalize: identity,
  },
  last_ack_action: {
    field: ALERT_WORKFLOW_STATUS,
    missing: 'open',
    normalize: (value) => (value === 'acknowledged' ? 'ack' : 'unack'),
  },
};

/** Returns the classic breakdown mapping for a v2 breakdown field, or undefined when none exists. */
export const resolveClassicHistogramBreakdown = (
  breakdownField: string
): ClassicHistogramBreakdown | undefined => CLASSIC_HISTOGRAM_BREAKDOWNS[breakdownField];

/** Contiguous epoch-millis ranges ending at each boundary: `(-inf, b0)`, `[b0, b1)`, ... */
const toSlotRanges = (boundaries: number[]): estypes.AggregationsAggregationRange[] =>
  boundaries.map((to, i) => (i > 0 ? { from: boundaries[i - 1], to } : { to }));

/**
 * Builds range aggregations whose running totals give, for histogram bucket `i`, the number
 * of alerts that started before the bucket ends (`started`) and the number that ended at or
 * before it starts (`ended`). Their difference is the bucket's overlap count. Open alerts have
 * no end and are treated as ending at `nowMs`, so they only count in buckets that start before now.
 *
 * With a breakdown, the same aggregations run per top `HISTOGRAM_MAX_BREAKDOWN_SERIES` term next
 * to the overall ones, so the counts of every other term can be derived as overall minus top terms.
 */
export const buildClassicAlertsHistogramAggs = ({
  buckets,
  nowMs,
  breakdown,
}: {
  buckets: TimeBucket[];
  nowMs: number;
  breakdown?: ClassicHistogramBreakdown;
}): Record<string, estypes.AggregationsAggregationContainer> => {
  const overlapAggs: Record<string, estypes.AggregationsAggregationContainer> = {
    started: {
      range: { field: ALERT_START, ranges: toSlotRanges(buckets.map(({ end }) => end)) },
    },
    ended: {
      range: {
        field: ALERT_END,
        missing: nowMs,
        // +1ms turns the exclusive `to` into "ended at or before the bucket start"
        ranges: toSlotRanges(buckets.map(({ start }) => start + 1)),
      },
    },
  };

  if (!breakdown) {
    return overlapAggs;
  }

  return {
    ...overlapAggs,
    breakdown: {
      terms: {
        field: breakdown.field,
        missing: breakdown.missing,
        size: HISTOGRAM_MAX_BREAKDOWN_SERIES,
      },
      aggs: overlapAggs,
    },
  };
};
