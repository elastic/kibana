/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import dateMath from '@kbn/datemath';
import {
  ALERT_DURATION,
  ALERT_RULE_TAGS,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_DELAYED,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  ALERT_UUID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type { EpisodesFilterState, EpisodesSortState } from '../../queries/episodes_query';
import {
  EPISODE_SEVERITY_CHART_VALUE,
  EPISODE_SEVERITIES,
  EPISODE_SEVERITY_FILTER_NONE,
  type EpisodeSeverity,
} from '../../components/severity/severity_utils';
import { V1_SEVERITY_MAP } from './map_alert';

export interface ClassicAlertsTimeRange {
  from: string;
  to: string;
}

const SUPPORTED_SEVERITIES = new Set(['info', 'low', 'medium', 'high', 'critical']);

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
  const v2Values = severities
    .filter((severity) => severity !== EPISODE_SEVERITY_FILTER_NONE)
    .map((severity) => severity.toLowerCase())
    .filter((severity) => SUPPORTED_SEVERITIES.has(severity));
  const includeNoSeverity = severities.includes(EPISODE_SEVERITY_FILTER_NONE);

  const v1Aliases = Object.entries(V1_SEVERITY_MAP)
    .filter(([, v2]) => v2Values.includes(v2))
    .map(([v1]) => v1);
  const values = [...new Set([...v2Values, ...v1Aliases])];

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
 * query for classic alerts. Filters without a classic equivalent (e.g. assignee)
 * intentionally exclude all classic rows.
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
    filters.push({ query_string: { query: trimmedSearch } });
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
    filters.push({ terms: { [ALERT_RULE_TAGS]: tags } });
  }

  if (filterState?.severity?.length) {
    filters.push(buildSeverityFilter(filterState.severity));
  }

  if (filterState?.assigneeUid) {
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

const SEVERITY_SORT_SCRIPT = [
  `def v = doc.containsKey('${ALERT_SEVERITY}') && !doc['${ALERT_SEVERITY}'].empty ? doc['${ALERT_SEVERITY}'].value : '';`,
  ...EPISODE_SEVERITIES.map(
    (s) => `if (v == '${s}') { return ${EPISODE_SEVERITY_CHART_VALUE[s]}; }`
  ),
  ...Object.entries(V1_SEVERITY_MAP).map(
    ([v1, v2]) =>
      `if (v == '${v1}') { return ${EPISODE_SEVERITY_CHART_VALUE[v2 as EpisodeSeverity]}; }`
  ),
  `return -1;`,
].join(' ');

export const buildClassicAlertsSort = (sortState?: EpisodesSortState): estypes.SortOptions[] => {
  const order = sortState?.sortDirection === 'asc' ? 'asc' : 'desc';

  if (sortState?.sortField === 'severity') {
    return [
      {
        _script: {
          type: 'number',
          script: { source: SEVERITY_SORT_SCRIPT, lang: 'painless' },
          order,
        },
      },
    ];
  }

  const field = (sortState && SORT_FIELD_MAP[sortState.sortField]) ?? TIMESTAMP;
  return [{ [field]: { order, unmapped_type: 'keyword' } }];
};
