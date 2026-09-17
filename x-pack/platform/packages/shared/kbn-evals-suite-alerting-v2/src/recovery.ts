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
  assertQueriedStyle,
  hasBreachSegment,
  hostCpuCreateTurn,
  MANAGE_RULE_SKILL_OUTPUT,
  PERSIST_VIA_ATTACHMENT_CRITERION,
  requireRuleVersions,
  type QueryStyle,
} from './rule_example_helpers';

const CUSTOM_THRESHOLD_REQUEST =
  'Treat a host as recovered only when its average system.cpu.total.norm.pct ' +
  'falls below 0.5 — not as soon as it drops back under 0.9.';

const RECOVERY_REQUESTS = {
  condition: CUSTOM_THRESHOLD_REQUEST,
  query: CUSTOM_THRESHOLD_REQUEST,
  manual:
    'Do not recover these alerts automatically. Leave them active even after CPU is back to normal.',
  no_breach: 'Recover automatically once CPU is no longer above 0.9.',
} as const;

export type RecoveryExampleStrategy = keyof typeof RECOVERY_REQUESTS;

const usesCustomRecoveryQuery = (strategy: RecoveryExampleStrategy): boolean =>
  strategy === 'condition' || strategy === 'query';

const assertCustomRecoveryQuery = (
  versions: RuleAttachmentData[],
  hostMetricsIndex: string,
  strategy: RecoveryExampleStrategy
) => {
  const customRecovery = versions.find(
    (version) => version.recovery?.strategy === strategy && version.query
  );
  expect(customRecovery).toBeDefined();
  expect(hasBreachSegment(customRecovery!.query)).toBe(strategy === 'condition');
  const recoveryEsql = getRecoverEsqlQuery(customRecovery!.query!, customRecovery!.recovery);
  expect(recoveryEsql).toBeDefined();
  expect(recoveryEsql).toContain(hostMetricsIndex);
  expect(recoveryEsql).toContain('system.cpu.total.norm.pct');
  expect(recoveryEsql).toMatch(/0\.5/);
};

export const recoveryExample = ({
  hostMetricsIndex,
  style,
  strategy,
}: {
  hostMetricsIndex: string;
  style: QueryStyle;
  strategy: RecoveryExampleStrategy;
}): RuleManagementExample => ({
  input: {
    turns: [hostCpuCreateTurn({ index: hostMetricsIndex, style }), RECOVERY_REQUESTS[strategy]],
  },
  output: {
    criteria: [
      style === 'segmented'
        ? 'The first-turn set_query uses a shared `query.base` plus a `query.breach.segment`.'
        : 'The first-turn set_query uses a single complete `query.base` with no `query.breach` segment.',
      ...(strategy === 'condition'
        ? [
            'The second-turn set_recovery uses `strategy: condition` with a `segment` appended to the shared base whose threshold is average `system.cpu.total.norm.pct` below 0.5 (not merely dropping back under 0.9).',
          ]
        : []),
      ...(strategy === 'query'
        ? [
            'The second-turn set_recovery uses `strategy: query` with a full ES|QL `query` whose threshold is average `system.cpu.total.norm.pct` below 0.5 (not merely dropping back under 0.9).',
          ]
        : []),
      'The recovery change is applied with manage_rule against the existing attachment (not a new rule), and the final manage_rule call ends with a validate operation.',
      PERSIST_VIA_ATTACHMENT_CRITERION,
    ],
    ...MANAGE_RULE_SKILL_OUTPUT,
    expectAttachmentData: (attachments) => {
      const versions = requireRuleVersions(attachments);
      assertQueriedStyle(versions, style);
      const latest = assertLatestHostCpuAlert(attachments, hostMetricsIndex);
      expect(latest.grouping?.fields).toEqual(expect.arrayContaining(['host.name']));
      expect(latest.recovery?.strategy).toEqual(strategy);
      if (usesCustomRecoveryQuery(strategy)) {
        assertCustomRecoveryQuery(versions, hostMetricsIndex, strategy);
      }
    },
  },
});
