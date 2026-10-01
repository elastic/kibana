/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode as risonEncode } from '@kbn/rison';

// ---------------------------------------------------------------------------
// URL param keys — copied from security_solution/public/common/hooks/constants.ts
// to avoid a cross-plugin dependency.
// ---------------------------------------------------------------------------
const FILTERS_KEY = 'filters';
const TIMERANGE_KEY = 'timerange';
const PAGE_FILTERS_KEY = 'pageFilters';
const ESQL_QUERY_KEY = 'cspq'; // entity analytics page uses this

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats one ISO string as an absolute rison-ready timerange object. */
const buildAbsoluteTimerange = (from: string, to: string): unknown => ({
  global: {
    linkTo: [],
    timerange: { from, kind: 'absolute', to },
  },
  timeline: {
    linkTo: [],
    timerange: { from, kind: 'absolute', to },
  },
});

/** Returns `from` = `createdAt − 7d` and `to` = `updatedAt + 1 min` (both ISO strings). */
const buildAlertTimeWindow = (
  createdAt: string,
  updatedAt: string
): { from: string; to: string } => {
  const fromMs = new Date(createdAt).getTime() - 7 * 24 * 60 * 60 * 1000;
  const toMs = new Date(updatedAt).getTime() + 60 * 1000;
  return { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() };
};

/** Escapes a string for use inside a KQL quoted phrase (e.g. `"a\"b"`). */
const escapeKqlPhrase = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

/**
 * Builds a Kibana filter object that matches documents by `_id`.
 *
 * - Single id → `phrase` filter → renders as `_id: <id> ×`
 * - Multiple ids → `phrases` filter → renders as `_id: one of N ×`
 *
 * Both use `match_phrase` under the hood, which is valid for `_id` in ES filter context.
 * The result lands in the `filters` URL param, not the KQL search bar, so the user sees
 * a dismissible pill rather than a query expression.
 */
const buildIdsFilter = (ids: readonly string[]): unknown => {
  if (ids.length === 1) {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      $state: { store: 'appState' },
      meta: {
        alias: null,
        disabled: false,
        key: '_id',
        negate: false,
        params: { query: ids[0] },
        type: 'phrase',
      },
      query: { match_phrase: { _id: ids[0] } },
    };
  }
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    $state: { store: 'appState' },
    meta: {
      alias: null,
      disabled: false,
      key: '_id',
      negate: false,
      params: [...ids],
      type: 'phrases',
    },
    query: {
      bool: {
        minimum_should_match: 1,
        should: ids.map((id) => ({ match_phrase: { _id: id } })),
      },
    },
  };
};

/** The `pageFilters` rison value that clears the Status filter (shows all statuses). */
const ALL_STATUSES_PAGE_FILTER: unknown = [
  {
    display_settings: { hide_action_bar: false },
    exclude: false,
    exists_selected: false,
    field_name: 'kibana.alert.workflow_status',
    selected_options: [],
    title: 'Status',
  },
];

/**
 * Encodes filters + timerange + pageFilters as a URLSearchParams string for the alerts/attacks pages.
 * The id filter lands in `filters` (shows as a dismissible pill) rather than in `query` (search bar).
 */
const buildAlertOrAttackParams = (
  ids: readonly string[],
  createdAt: string,
  updatedAt: string
): URLSearchParams => {
  const { from, to } = buildAlertTimeWindow(createdAt, updatedAt);
  const params = new URLSearchParams();
  params.set(FILTERS_KEY, risonEncode([buildIdsFilter(ids)]));
  params.set(TIMERANGE_KEY, risonEncode(buildAbsoluteTimerange(from, to)));
  params.set(PAGE_FILTERS_KEY, risonEncode(ALL_STATUSES_PAGE_FILTER));
  return params;
};

// ---------------------------------------------------------------------------
// Public builders
// ---------------------------------------------------------------------------

/**
 * Builds a URL to the Security alerts page filtered to the given alert ids.
 * Returns `undefined` when `alertIds` is empty.
 */
export const buildAlertsPageUrl = (
  getSecurityAppUrl: (path: string) => string,
  alertIds: readonly string[],
  createdAt: string,
  updatedAt: string
): string | undefined => {
  if (alertIds.length === 0) return undefined;
  const params = buildAlertOrAttackParams(alertIds, createdAt, updatedAt);
  return getSecurityAppUrl(`/alerts?${params.toString()}`);
};

/**
 * Builds a URL to the Security attacks page filtered to the given attack discovery ids.
 * Returns `undefined` when `attackIds` is empty.
 */
export const buildAttacksPageUrl = (
  getSecurityAppUrl: (path: string) => string,
  attackIds: readonly string[],
  createdAt: string,
  updatedAt: string
): string | undefined => {
  if (attackIds.length === 0) return undefined;
  const params = buildAlertOrAttackParams(attackIds, createdAt, updatedAt);
  return getSecurityAppUrl(`/attacks?${params.toString()}`);
};

/**
 * Builds a URL to the Entity analytics home page filtered to the given entity terms.
 * Returns `undefined` when `entityTerms` is empty.
 */
export const buildEntityAnalyticsPageUrl = (
  getSecurityAppUrl: (path: string) => string,
  entityTerms: readonly string[]
): string | undefined => {
  if (entityTerms.length === 0) return undefined;

  const query = entityTerms
    .map(
      (term) => `entity.id: "${escapeKqlPhrase(term)}" or entity.name: "${escapeKqlPhrase(term)}"`
    )
    .join(' or ');

  const cspq = risonEncode({ filters: [], pageIndex: 0, query: { language: 'kuery', query } });
  const params = new URLSearchParams();
  params.set(ESQL_QUERY_KEY, cspq);
  return getSecurityAppUrl(`/entity_analytics_home_page?${params.toString()}`);
};

/**
 * Builds a URL to the Security rules management page.
 * With a single rule and a label, pre-fills the search term.
 * Always links to `/rules/management` (not `/rules`, which drops the query string on redirect).
 */
export const buildRulesPageUrl = (
  getSecurityAppUrl: (path: string) => string,
  ruleCount: number,
  firstRuleLabel: string | undefined
): string => {
  if (ruleCount === 1 && firstRuleLabel) {
    const rulesTable = risonEncode({ searchTerm: firstRuleLabel });
    const params = new URLSearchParams();
    params.set('rulesTable', rulesTable);
    return getSecurityAppUrl(`/rules/management?${params.toString()}`);
  }
  return getSecurityAppUrl('/rules/management');
};
