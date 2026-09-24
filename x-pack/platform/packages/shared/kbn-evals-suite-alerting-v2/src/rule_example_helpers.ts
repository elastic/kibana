/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  getBreachEsqlQuery,
  RULE_ATTACHMENT_TYPE,
  type Query,
  type RuleAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { expect } from '@playwright/test';
import {
  ALERTING_TOOL_IDS,
  DETECTION_RULE_EDIT_SKILL_ID,
  RULE_MANAGEMENT_SKILL_ID,
} from './constants';
import {
  getAttachmentVersionData,
  getLatestAttachmentData,
} from './evaluators/expected_attachment';

/**
 * How the create turn asks for the detection query to be shaped: `segmented`
 * puts the condition in `query.breach.segment` on top of a shared `query.base`,
 * `single` asks for one complete `query.base` with no breach segment.
 */
export type QueryStyle = 'segmented' | 'single';

export const MANAGE_RULE_SKILL_OUTPUT = {
  expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
  expectedToolIds: [ALERTING_TOOL_IDS.manageRule],
  expectRenderAttachment: [RULE_ATTACHMENT_TYPE],
} as const;

export const PERSIST_VIA_ATTACHMENT_CRITERION =
  'The assistant directs the user to the Create rule button / attachment actions instead of claiming the rule was persisted via API.';

export const hasBreachSegment = (query: Query | undefined): boolean => query?.breach != null;

export const requireRuleVersions = (attachments: VersionedAttachment[]) => {
  const versions = getAttachmentVersionData<RuleAttachmentData>(attachments, RULE_ATTACHMENT_TYPE);
  expect(versions.length).toBeGreaterThan(0);
  return versions;
};

export const hostCpuCreateTurn = ({
  index,
  style,
}: {
  index: string;
  style: QueryStyle;
}): string => {
  const styleClause =
    style === 'segmented'
      ? 'with a shared base ES|QL query and a breach segment appended to it'
      : 'with one complete ES|QL query and no separate breach segment';
  return (
    `Create an alert rule on ${index} ${styleClause}. Fire when average ` +
    `system.cpu.total.norm.pct stays above 0.9 for 5 minutes, grouped by host.name. ` +
    'Check every 1 minute.'
  );
};

export const assertQueriedStyle = (versions: RuleAttachmentData[], style: QueryStyle) => {
  const queried = versions.filter((version) => version.query);
  expect(queried.length).toBeGreaterThan(0);
  for (const version of queried) {
    expect(hasBreachSegment(version.query)).toEqual(style === 'segmented');
  }
};

export const assertLatestHostCpuAlert = (
  attachments: VersionedAttachment[],
  hostMetricsIndex: string
): RuleAttachmentData => {
  const latest = getLatestAttachmentData<RuleAttachmentData>(attachments, RULE_ATTACHMENT_TYPE);
  expect(latest).toBeDefined();
  expect(latest!.kind).toEqual('alert');
  const breachEsql = latest!.query ? getBreachEsqlQuery(latest!.query) : '';
  expect(breachEsql).toContain(hostMetricsIndex);
  expect(breachEsql).toContain('system.cpu.total.norm.pct');
  return latest!;
};
