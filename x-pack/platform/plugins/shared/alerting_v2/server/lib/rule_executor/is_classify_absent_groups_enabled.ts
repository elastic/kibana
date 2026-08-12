/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNoDataEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { RuleResponse } from '../rules_client';

/**
 * Whether a run needs absent groups classification (recovery and/or no-data),
 * which is the only situation where the rule's currently-active groups matter.
 *
 * Shared by `FetchActiveGroupsStep` and mirrors the gating in
 * `ClassifyAbsentGroupsStep`. Absence classification only applies to
 * `kind: 'alert'` rules; signals are never episode-tracked.
 */
export const isClassifyAbsentGroupsEnabled = (rule: RuleResponse): boolean => {
  if (rule.kind !== 'alert') {
    return false;
  }

  const recoveryEnabled = rule.recovery_strategy != null && rule.recovery_strategy !== 'none';
  const noDataEnabled = getNoDataEsqlQuery(rule.query, rule.no_data_strategy) != null;

  return recoveryEnabled || noDataEnabled;
};
