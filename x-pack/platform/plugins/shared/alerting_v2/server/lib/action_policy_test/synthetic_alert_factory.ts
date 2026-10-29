/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEVERITY_LEVELS } from '@kbn/alerting-v2-schemas';
import { set } from '@kbn/safer-lodash-set';
import seedrandom from 'seedrandom';
import { buildAlertDetailsUrl } from '../dispatcher/alert_details_url';
import type { ActionPolicy, Alert, AlertData, Rule } from '../dispatcher/types';

/** Prefix of every synthetic id, so a test payload can never be mistaken for a real alert or rule. */
export const TEST_ID_PREFIX = 'test-';

/** Alerts in the group of an aggregated (`all` / `per_field`) policy. */
export const DEFAULT_AGGREGATED_ALERT_COUNT = 3;

/** Most placeholder rules the alerts of an aggregated policy are spread across. */
const MAX_PLACEHOLDER_RULES = 3;

const DATA_FIELD_PREFIX = 'data.';

export interface SyntheticScenarioParams {
  policy: ActionPolicy;
  kibanaBaseUrl: string;
  seed: number;
  now: Date;
}

export interface SyntheticScenario {
  alerts: Alert[];
  rules: Rule[];
}

const randomHex = (random: () => number): string =>
  Math.floor(random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');

/**
 * Placeholder `data` for the `data.*` fields that `per_field` grouping reads. Every alert of the
 * scenario shares these values, so they all land in one group.
 */
const buildGroupingData = (policy: ActionPolicy, suffix: string): AlertData | undefined => {
  if (policy.grouping.mode !== 'per_field') {
    return undefined;
  }

  const dataPaths = policy.grouping.fields
    .filter((field) => field.startsWith(DATA_FIELD_PREFIX))
    .map((field) => field.slice(DATA_FIELD_PREFIX.length))
    .filter((path) => path.length > 0);

  if (dataPaths.length === 0) {
    return undefined;
  }

  const data: AlertData = {};
  for (const path of dataPaths) {
    set(data, path, `${TEST_ID_PREFIX}${path}-${suffix}`);
  }
  return data;
};

/**
 * Builds placeholder rules and alerts for a policy, from its configuration alone. The rules carry
 * the policy routing tags, so the alerts pass the dispatcher routing-tag check. Deterministic for
 * a seed, apart from `last_event_timestamp`, which is `now`.
 */
export const createSyntheticScenario = ({
  policy,
  kibanaBaseUrl,
  seed,
  now,
}: SyntheticScenarioParams): SyntheticScenario => {
  const random = seedrandom(String(seed));
  const { spaceId } = policy;
  const alertCount = policy.grouping.mode === 'per_alert' ? 1 : DEFAULT_AGGREGATED_ALERT_COUNT;
  const ruleCount = Math.min(alertCount, MAX_PLACEHOLDER_RULES);
  const routingTags = [...(policy.matcher?.tags ?? [])];

  const rules: Rule[] = Array.from({ length: ruleCount }, (_, index) => ({
    id: `${TEST_ID_PREFIX}rule-${index + 1}-${randomHex(random)}`,
    spaceId,
    name: `Test rule ${index + 1}`,
    routingTags,
  }));

  const severity = SEVERITY_LEVELS[Math.floor(random() * SEVERITY_LEVELS.length)];
  const data = buildGroupingData(policy, randomHex(random));
  const lastEventTimestamp = now.toISOString();

  const alerts: Alert[] = Array.from({ length: alertCount }, (_, index) => {
    const alertId = `${TEST_ID_PREFIX}alert-${randomHex(random)}`;
    return {
      last_event_timestamp: lastEventTimestamp,
      rule_id: rules[index % ruleCount].id,
      source: 'internal',
      space_id: spaceId,
      group_hash: `${TEST_ID_PREFIX}group-hash-${randomHex(random)}`,
      alert_id: alertId,
      alert_status: 'active',
      severity,
      ...(data ? { data } : {}),
      alert_url: buildAlertDetailsUrl({ baseUrl: kibanaBaseUrl, spaceId, alertId }),
    };
  });

  return { alerts, rules };
};
