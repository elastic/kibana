/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getBreachEsqlQuery,
  getNoDataEsqlQuery,
  type RuleAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { expect } from '@playwright/test';
import type { RuleManagementExample } from './types';
import {
  assertLatestHostCpuAlert,
  assertQueriedFormat,
  hostCpuCreateTurn,
  isComposedQuery,
  isStandaloneQuery,
  MANAGE_RULE_SKILL_OUTPUT,
  PERSIST_VIA_ATTACHMENT_CRITERION,
  requireRuleVersions,
  type QueryFormat,
} from './rule_example_helpers';

const NO_DATA_REQUESTS = {
  last_known_status:
    'If a host goes quiet and stops sending metrics, keep whatever alert status it already had.',
  recover:
    'If a host goes quiet and stops sending metrics, treat that as recovered instead of holding the old status.',
  none: 'If a host stops sending metrics, leave the alert unchanged — ignore missing data.',
} as const;

const STANDALONE_PRESENCE_QUERY =
  ' Detect missing data with a separate query that counts documents per host.name — not the CPU average.';

export type NoDataExampleStrategy = keyof typeof NO_DATA_REQUESTS;

const needsStandalonePresenceQuery = (strategy: NoDataExampleStrategy): boolean =>
  strategy !== 'none';

const noDataRequest = (format: QueryFormat, strategy: NoDataExampleStrategy): string => {
  const request = NO_DATA_REQUESTS[strategy];
  if (format === 'standalone' && needsStandalonePresenceQuery(strategy)) {
    return `${request}${STANDALONE_PRESENCE_QUERY}`;
  }
  return request;
};

const assertCustomStandaloneNoDataQuery = (
  versions: RuleAttachmentData[],
  hostMetricsIndex: string
) => {
  const customNoData = versions.find((version) => {
    if (version.no_data_strategy === 'none' || !version.query) {
      return false;
    }
    return Boolean(getNoDataEsqlQuery(version.query, version.no_data_strategy));
  });
  expect(customNoData).toBeDefined();
  expect(isStandaloneQuery(customNoData!.query)).toBe(true);
  const noDataEsql = getNoDataEsqlQuery(customNoData!.query!, customNoData!.no_data_strategy);
  expect(noDataEsql).toBeDefined();
  expect(noDataEsql).toContain(hostMetricsIndex);
  expect(noDataEsql).toContain('host.name');
  expect(noDataEsql?.toLowerCase()).toMatch(/count/);
  const breachEsql = customNoData!.query ? getBreachEsqlQuery(customNoData!.query) : '';
  expect(noDataEsql).not.toEqual(breachEsql);
};

export const noDataExample = ({
  hostMetricsIndex,
  format,
  strategy,
}: {
  hostMetricsIndex: string;
  format: QueryFormat;
  strategy: NoDataExampleStrategy;
}): RuleManagementExample => ({
  input: {
    turns: [
      hostCpuCreateTurn({ index: hostMetricsIndex, format }),
      noDataRequest(format, strategy),
    ],
  },
  output: {
    criteria: [
      format === 'composed'
        ? 'The first-turn set_query uses `query.format: composed` (shared `base` + `breach.segment`), not standalone.'
        : 'The first-turn set_query uses `query.format: standalone` (full independent ES|QL queries), not composed.',
      ...(format === 'composed'
        ? [
            'Composed format has no `query.no_data` block — the `base` query is the data-presence query.',
          ]
        : needsStandalonePresenceQuery(strategy)
        ? [
            'Standalone format includes a `query.no_data` ES|QL block that counts documents per host.name, distinct from the breach query.',
          ]
        : []),
      'The no-data change is applied with manage_rule against the existing attachment (not a new rule), and the final manage_rule call ends with a validate operation.',
      PERSIST_VIA_ATTACHMENT_CRITERION,
    ],
    ...MANAGE_RULE_SKILL_OUTPUT,
    expectAttachmentData: (attachments) => {
      const versions = requireRuleVersions(attachments);
      assertQueriedFormat(versions, format);
      if (format === 'composed') {
        for (const version of versions) {
          if (isComposedQuery(version.query)) {
            expect(version.query).not.toHaveProperty('no_data');
          }
        }
      } else if (needsStandalonePresenceQuery(strategy)) {
        assertCustomStandaloneNoDataQuery(versions, hostMetricsIndex);
      }
      const latest = assertLatestHostCpuAlert(attachments, hostMetricsIndex);
      expect(latest.grouping?.fields).toEqual(expect.arrayContaining(['host.name']));
      expect(latest.no_data_strategy).toEqual(strategy);
    },
  },
});
