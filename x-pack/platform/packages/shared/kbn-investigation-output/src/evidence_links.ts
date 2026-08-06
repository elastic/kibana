/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { InvestigationEvidence } from '@kbn/significant-events-schema';

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
