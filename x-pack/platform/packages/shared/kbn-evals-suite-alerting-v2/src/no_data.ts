/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getBreachEsqlQuery,
  getNoDataEsqlQuery,
  type NoData,
  type RuleAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { expect } from '@playwright/test';
import type { RuleManagementExample } from './types';
import {
  assertLatestHostCpuAlert,
  assertQueriedStyle,
  hostCpuCreateTurn,
  MANAGE_RULE_SKILL_OUTPUT,
  PERSIST_VIA_ATTACHMENT_CRITERION,
  requireRuleVersions,
  type QueryStyle,
} from './rule_example_helpers';

// `alert` is missing on purpose: the write API rejects it, so the agent cannot
// save a rule that uses it.
const NO_DATA_REQUESTS = {
  keep_last:
    'If a host goes quiet and stops sending metrics, keep whatever alert status it already had.',
  resolve:
    'If a host goes quiet and stops sending metrics, treat that as recovered instead of holding the old status.',
  ignore:
    'Do not do anything special for missing data — only evaluate the hosts that are still reporting.',
} as const;

const PRESENCE_QUERY_REQUEST =
  ' Detect missing data with a separate query that counts documents per host.name — not the CPU average.';

export type NoDataExampleStrategy = keyof typeof NO_DATA_REQUESTS;

const classifiesAbsence = (strategy: NoDataExampleStrategy): boolean => strategy !== 'ignore';

/**
 * Only the `single` style asks for a dedicated presence query; with a shared
 * base the base query itself is the presence query.
 */
const needsPresenceQuery = (style: QueryStyle, strategy: NoDataExampleStrategy): boolean =>
  style === 'single' && classifiesAbsence(strategy);

const noDataRequest = (style: QueryStyle, strategy: NoDataExampleStrategy): string => {
  const request = NO_DATA_REQUESTS[strategy];
  return needsPresenceQuery(style, strategy) ? `${request}${PRESENCE_QUERY_REQUEST}` : request;
};

/** Only the absence-classifying strategies carry a presence query. */
const getPresenceQuery = (noData: NoData | undefined): string | undefined =>
  noData != null && noData.strategy !== 'ignore' ? noData.query : undefined;

const assertCustomNoDataQuery = (versions: RuleAttachmentData[], hostMetricsIndex: string) => {
  const customNoData = versions.find(
    (version) => getPresenceQuery(version.no_data) != null && version.query
  );
  expect(customNoData).toBeDefined();
  const noDataEsql = getNoDataEsqlQuery(customNoData!.query!, customNoData!.no_data);
  expect(noDataEsql).toBeDefined();
  expect(noDataEsql).toContain(hostMetricsIndex);
  expect(noDataEsql).toContain('host.name');
  expect(noDataEsql?.toLowerCase()).toMatch(/count/);
  expect(noDataEsql).not.toEqual(getBreachEsqlQuery(customNoData!.query!));
};

export const noDataExample = ({
  hostMetricsIndex,
  style,
  strategy,
}: {
  hostMetricsIndex: string;
  style: QueryStyle;
  strategy: NoDataExampleStrategy;
}): RuleManagementExample => ({
  input: {
    turns: [hostCpuCreateTurn({ index: hostMetricsIndex, style }), noDataRequest(style, strategy)],
  },
  output: {
    criteria: [
      style === 'segmented'
        ? 'The first-turn set_query uses a shared `query.base` plus a `query.breach.segment`.'
        : 'The first-turn set_query uses a single complete `query.base` with no `query.breach` segment.',
      needsPresenceQuery(style, strategy)
        ? 'The rule carries a `no_data.query` ES|QL query that counts documents per host.name, distinct from the breach query.'
        : 'The rule carries no `no_data.query`.',
      `The final rule sets \`no_data.strategy\` to \`${strategy}\`.`,
      'The no-data change is applied with manage_rule against the existing attachment (not a new rule), and the final manage_rule call ends with a validate operation.',
      PERSIST_VIA_ATTACHMENT_CRITERION,
    ],
    ...MANAGE_RULE_SKILL_OUTPUT,
    expectAttachmentData: (attachments) => {
      const versions = requireRuleVersions(attachments);
      assertQueriedStyle(versions, style);
      if (needsPresenceQuery(style, strategy)) {
        assertCustomNoDataQuery(versions, hostMetricsIndex);
      } else {
        for (const version of versions) {
          expect(getPresenceQuery(version.no_data)).toBeUndefined();
        }
      }
      const latest = assertLatestHostCpuAlert(attachments, hostMetricsIndex);
      expect(latest.grouping?.fields).toEqual(expect.arrayContaining(['host.name']));
      expect(latest.no_data?.strategy).toEqual(strategy);
    },
  },
});
