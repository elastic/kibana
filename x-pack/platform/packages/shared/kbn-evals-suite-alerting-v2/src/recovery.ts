/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRecoverEsqlQuery, type RuleAttachmentData } from '@kbn/alerting-v2-schemas';
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

const RECOVERY_REQUESTS = {
  query:
    'Treat a host as recovered only when its average system.cpu.total.norm.pct ' +
    'falls below 0.5 — not as soon as it drops back under 0.9.',
  none: 'Do not recover these alerts automatically. Leave them active even after CPU is back to normal.',
  no_breach: 'Recover automatically once CPU is no longer above 0.9.',
} as const;

export type RecoveryExampleStrategy = keyof typeof RECOVERY_REQUESTS;

const assertCustomRecoveryQuery = (
  versions: RuleAttachmentData[],
  hostMetricsIndex: string,
  format: QueryFormat
) => {
  const customRecovery = versions.find(
    (version) => version.recovery_strategy === 'query' && version.query
  );
  expect(customRecovery).toBeDefined();
  if (format === 'composed') {
    expect(isComposedQuery(customRecovery!.query)).toBe(true);
  } else {
    expect(isStandaloneQuery(customRecovery!.query)).toBe(true);
  }
  const recoveryEsql = getRecoverEsqlQuery(customRecovery!.query!, 'query');
  expect(recoveryEsql).toBeDefined();
  expect(recoveryEsql).toContain(hostMetricsIndex);
  expect(recoveryEsql).toContain('system.cpu.total.norm.pct');
  expect(recoveryEsql).toMatch(/0\.5/);
};

export const recoveryExample = ({
  hostMetricsIndex,
  format,
  strategy,
}: {
  hostMetricsIndex: string;
  format: QueryFormat;
  strategy: RecoveryExampleStrategy;
}): RuleManagementExample => ({
  input: {
    turns: [hostCpuCreateTurn({ index: hostMetricsIndex, format }), RECOVERY_REQUESTS[strategy]],
  },
  output: {
    criteria: [
      format === 'composed'
        ? 'The first-turn set_query uses `query.format: composed` (shared `base` + `breach.segment`), not standalone.'
        : 'The first-turn set_query uses `query.format: standalone` (full independent ES|QL queries), not composed.',
      ...(strategy === 'query'
        ? [
            'The second-turn set_query includes a `query.recovery` ES|QL block whose threshold is average `system.cpu.total.norm.pct` below 0.5 (not merely dropping back under 0.9).',
          ]
        : []),
      'The recovery change is applied with manage_rule against the existing attachment (not a new rule), and the final manage_rule call ends with a validate operation.',
      PERSIST_VIA_ATTACHMENT_CRITERION,
    ],
    ...MANAGE_RULE_SKILL_OUTPUT,
    expectAttachmentData: (attachments) => {
      const versions = requireRuleVersions(attachments);
      assertQueriedFormat(versions, format);
      const latest = assertLatestHostCpuAlert(attachments, hostMetricsIndex);
      expect(latest.grouping?.fields).toEqual(expect.arrayContaining(['host.name']));
      expect(latest.recovery_strategy).toEqual(strategy);
      if (strategy === 'query') {
        assertCustomRecoveryQuery(versions, hostMetricsIndex, format);
      }
    },
  },
});
