/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode as risonEncode } from '@kbn/rison';
import {
  getActiveAttachments,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';

// URL param keys — copied from security_solution/public/common/hooks/constants.ts
// to avoid a cross-plugin dependency.
export const FILTERS_KEY = 'filters';
export const TIMERANGE_KEY = 'timerange';
export const PAGE_FILTERS_KEY = 'pageFilters';
export const ESQL_QUERY_KEY = 'cspq';

/** Returns active, non-hidden attachments. */
export const getVisibleAttachments = (
  attachments: readonly VersionedAttachment[]
): VersionedAttachment[] =>
  getActiveAttachments(attachments as VersionedAttachment[]).filter((a) => !a.hidden);

/** Returns the ISO string of the first (oldest) version's `created_at`. */
export const firstCreatedAt = (attachment: VersionedAttachment): string | undefined =>
  attachment.versions.length > 0 ? attachment.versions[0].created_at : undefined;

/** Returns the ISO string of the latest version's `created_at` (upper bound for timerange). */
export const lastUpdatedAt = (attachment: VersionedAttachment): string | undefined =>
  attachment.versions.length > 0
    ? attachment.versions[attachment.versions.length - 1].created_at
    : undefined;

export const minDate = (a: string | undefined, b: string | undefined): string | undefined => {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
};

export const maxDate = (a: string | undefined, b: string | undefined): string | undefined => {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
};

/** Escapes a string for use inside a KQL quoted phrase (e.g. `"a\"b"`). */
export const escapeKqlPhrase = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const buildAbsoluteTimerange = (from: string, to: string): unknown => ({
  global: { linkTo: [], timerange: { from, kind: 'absolute', to } },
  timeline: { linkTo: [], timerange: { from, kind: 'absolute', to } },
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

/**
 * Builds a Kibana filter object that matches documents by `_id`.
 *
 * - Single id → `phrase` filter → renders as `_id: <id> ×`
 * - Multiple ids → `phrases` filter → renders as `_id: one of N ×`
 */
export const buildIdsFilter = (ids: readonly string[]): unknown => {
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
export const ALL_STATUSES_PAGE_FILTER: unknown = [
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
 * Encodes filters + timerange + pageFilters for the alerts/attacks pages.
 * The id filter lands in `filters` (pill) not `query` (search bar).
 */
export const buildAlertOrAttackParams = (
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
