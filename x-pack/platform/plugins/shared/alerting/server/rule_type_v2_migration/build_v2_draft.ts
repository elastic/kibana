/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_ARTIFACT_TYPE, RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { resolveArtifactId } from '@kbn/alerting-v2-utils';
import type { RuleTypeParams, SanitizedRule } from '../types';
import type { RuleTypeV2Migration, RuleV2Draft } from './types';

/** The part of a classic rule the conversion reads. */
export type RuleToMigrate<Params extends RuleTypeParams> = Pick<
  SanitizedRule<Params>,
  'name' | 'tags' | 'schedule' | 'params' | 'alertDelay' | 'artifacts'
>;

const getNonEmptyString = (value?: string): string | undefined =>
  value?.trim() ? value.trim() : undefined;

const getArtifacts = ({ artifacts }: RuleToMigrate<RuleTypeParams>): RuleV2Draft['artifacts'] => {
  const runbook = getNonEmptyString(artifacts?.investigation_guide?.blob);
  const converted = [
    ...(runbook
      ? [
          {
            id: resolveArtifactId(RUNBOOK_ARTIFACT_TYPE),
            type: RUNBOOK_ARTIFACT_TYPE,
            data: { content: runbook },
          },
        ]
      : []),
    ...(artifacts?.dashboards ?? []).map(({ id }) => ({
      id: resolveArtifactId(DASHBOARD_ARTIFACT_TYPE),
      type: DASHBOARD_ARTIFACT_TYPE,
      data: { dashboard_id: id },
    })),
  ];

  return converted.length ? converted : undefined;
};

/**
 * Converts a classic rule into an alerting v2 rule draft. The framework maps the fields every
 * rule has; the rule type's migration maps its params. Rethrows whatever the migration throws.
 */
export const buildV2Draft = <Params extends RuleTypeParams>(
  rule: RuleToMigrate<Params>,
  { toV2Draft }: RuleTypeV2Migration<Params>
): RuleV2Draft => {
  const { name, tags, schedule, params, alertDelay } = rule;
  const { lookback, ...paramsDraft } = toV2Draft(params);
  const artifacts = getArtifacts(rule);

  return {
    ...paramsDraft,
    kind: 'alert',
    metadata: { name, ...(tags.length ? { tags } : {}) },
    schedule: { every: schedule.interval, lookback },
    recovery: { strategy: 'no_breach' },
    no_data: { strategy: 'ignore' },
    // A classic alert delay of N runs is N - 1 pending evaluations before the alert is active.
    state_transition: {
      pending: { count: Math.max((alertDelay?.active ?? 1) - 1, 0) },
      recovering: { count: 0 },
    },
    ...(artifacts ? { artifacts } : {}),
  };
};
