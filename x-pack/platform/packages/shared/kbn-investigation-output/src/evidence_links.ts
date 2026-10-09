/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type {
  InvestigationEvidence,
  InvestigationEvidenceCode,
} from '@kbn/significant-events-schema';

/**
 * Discover locator params, structurally compatible with `DiscoverAppLocatorParams`. Declared here
 * so this package stays free of plugin dependencies — consumers pass the result straight to
 * `share.url.locators.get(DISCOVER_APP_LOCATOR)`.
 */
export interface InvestigationDiscoverParams extends SerializableRecord {
  query: { esql: string };
  timeRange: { from: string; to: string };
  interval: string;
}

/**
 * Parses a bound as an absolute instant we can hand to Discover as-is. Datemath (`now-1h`) and
 * malformed values parse to `NaN` here and are rejected: resolved at click time they would frame
 * a window unrelated to the one the query actually ran over, which reads as real evidence while
 * showing the wrong data — a worse failure than no link.
 */
const parseAbsoluteTimestamp = (value: string): number | undefined => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
};

/**
 * Builds the Discover params for an evidence entry's query, or `undefined` when it has none that
 * can be opened faithfully. Both the query and an absolute window are required: the agent's
 * queries carry absolute bounds in their WHERE clauses, so opening one without its `time_range`
 * would let Discover apply its own default range on top and land the reader on zero rows — worse
 * than showing no link at all.
 */
export const buildEvidenceDiscoverParams = (
  evidence: InvestigationEvidence
): InvestigationDiscoverParams | undefined => {
  const { esql_query: esqlQuery, time_range: timeRange } = evidence;

  if (!esqlQuery || !timeRange) {
    return undefined;
  }

  const from = parseAbsoluteTimestamp(timeRange.from);
  const to = parseAbsoluteTimestamp(timeRange.to);

  if (from === undefined || to === undefined || from >= to) {
    return undefined;
  }

  return {
    query: { esql: esqlQuery },
    timeRange: { from: timeRange.from, to: timeRange.to },
    interval: 'auto',
  };
};

const encodePath = (path: string): string => path.split('/').map(encodeURIComponent).join('/');

/**
 * Whether a value contains `.` or `..` segments. Percent-encoding does not neutralise these —
 * `encodeURIComponent('..')` is `'..'` — and the browser resolves them before issuing the request,
 * so a crafted `path` can climb out of the repository it claims to be in and land on a different
 * one while the chip still shows only the file name.
 */
const hasDotSegment = (value: string): boolean =>
  value.split('/').some((segment) => segment === '.' || segment === '..');

/**
 * A bare hostname, optionally with a port. Percent-encoding is wrong here — it would mangle the
 * colon of a `host:port` into `%3A` and produce a URL the browser rejects — so the value is
 * validated instead. This also keeps the origin constrained to something hostname-shaped rather
 * than accepting whatever the model reported.
 */
const HOSTNAME_PATTERN = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/**
 * Builds the blob URL for a code reference, or `undefined` when it cannot be linked faithfully.
 *
 * All three conditions matter, for different reasons:
 *
 * - `source` must be `github_connector`, because the `/{repo}/blob/{ref}/{path}` shape below is
 *   GitHub's. GitHub Enterprise uses the same shape, but GitLab (`/-/blob/`) and Bitbucket do not,
 *   so applying it to any other forge yields a plausible-looking link that 404s.
 * - `host` supplies the origin, and comes from the tool's own response rather than being assumed —
 *   a bare `owner/repo` does not identify a forge, so guessing would point `acme/checkout` at an
 *   unrelated public repository of the same name.
 * - `ref` pins the revision. Without it the link tracks the default branch, so a reader following
 *   it later may see code that has since changed and conclude the investigation was wrong.
 *
 */
export const buildCodeReferenceUrl = ({
  source,
  host,
  repo,
  path,
  ref,
}: InvestigationEvidenceCode): string | undefined => {
  if (source !== 'github_connector' || !host || !ref) {
    return undefined;
  }

  if (!HOSTNAME_PATTERN.test(host) || hasDotSegment(repo) || hasDotSegment(path)) {
    return undefined;
  }

  return `https://${host}/${encodePath(repo)}/blob/${encodeURIComponent(ref)}/${encodePath(path)}`;
};

/** Compact chip label for a code reference: the file name on its own, e.g. `pool.ts`. */
export const formatCodeReferenceLabel = ({ path }: InvestigationEvidenceCode): string =>
  path.split('/').pop() || path;

/** How many characters of a commit SHA to show. */
const SHORT_SHA_LENGTH = 7;

/**
 * Matches a FULL commit SHA. Deliberately not `{7,40}`: an abbreviated SHA is already short enough
 * to show whole, and a looser pattern would also match a hex-looking branch name — so a branch
 * called `deadbeef` would be truncated to `deadbee` and read as a pinned revision, inverting the
 * distinction this is here to preserve.
 */
const FULL_COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

/**
 * The full provenance of a code reference, for the chip's tooltip: which host, which repository,
 * which file, and which revision. Long SHAs are shortened; anything else is shown verbatim so a
 * reader can tell a pinned reference from an unpinned one.
 *
 * The host leads when present because the link is built from it — showing it lets the reader see
 * where they are about to be sent, which matters more than usual given the value is model-reported.
 */
export const formatCodeReferenceDetail = ({
  host,
  repo,
  path,
  ref,
}: InvestigationEvidenceCode): string => {
  const location = [host, repo, path].filter(Boolean).join('/');

  if (!ref) {
    return location;
  }

  return `${location} @ ${
    FULL_COMMIT_SHA_PATTERN.test(ref) ? ref.slice(0, SHORT_SHA_LENGTH) : ref
  }`;
};
