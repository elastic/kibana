/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Rule,
  RuleError,
  RuleResponseBuckets,
} from '../../../../containers/detection_engine/rules';
import { TableData } from '../types';

/**
 * Formats rules into the correct format for the AllRulesTable
 *
 * @param rules as returned from the Rules API
 * @param selectedIds ids of the currently selected rules
 */
export const formatRules = (rules: Rule[], selectedIds?: string[]): TableData[] =>
  rules.map(rule => ({
    id: rule.id,
    immutable: rule.immutable,
    rule_id: rule.rule_id,
    rule: {
      href: `#/detections/rules/id/${encodeURIComponent(rule.id)}`,
      name: rule.name,
    },
    risk_score: rule.risk_score,
    severity: rule.severity,
    tags: rule.tags ?? [],
    activate: rule.enabled,
    status: rule.status ?? null,
    statusDate: rule.status_date ?? null,
    sourceRule: rule,
    isLoading: selectedIds?.includes(rule.id) ?? false,
  }));

/**
 * Separates rules/errors from bulk rules API response (create/update/delete)
 *
 * @param response Array<Rule | RuleError> from bulk rules API
 */
export const bucketRulesResponse = (response: Array<Rule | RuleError>) =>
  response.reduce<RuleResponseBuckets>(
    (acc, cv): RuleResponseBuckets => {
      return 'error' in cv
        ? { rules: [...acc.rules], errors: [...acc.errors, cv] }
        : { rules: [...acc.rules, cv], errors: [...acc.errors] };
    },
    { rules: [], errors: [] }
  );

export const showRulesTable = ({
  isInitialLoad,
  rulesCustomInstalled,
  rulesInstalled,
}: {
  isInitialLoad: boolean;
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
}) =>
  !isInitialLoad &&
  ((rulesCustomInstalled != null && rulesCustomInstalled > 0) ||
    (rulesInstalled != null && rulesInstalled > 0));
