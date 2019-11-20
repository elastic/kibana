/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Rule } from '../../../../containers/detection_engine/rules/types';
import { TableData } from '../types';
import { getEmptyValue } from '../../../../components/empty_value';

export const formatRules = (rules: Rule[], selectedRules?: string[]): TableData[] =>
  rules.map(rule => ({
    rule_id: rule.rule_id,
    rule: {
      href: `#/detection-engine/rules/rule-details/${encodeURIComponent(rule.id)}`,
      name: rule.name,
      status: 'Status Placeholder',
    },
    method: rule.type, // Map to i18n
    severity: rule.severity,
    lastCompletedRun: undefined, // Frank Plumber
    lastResponse: {
      type: getEmptyValue(), // Frank Plumber
    },
    tags: rule.tags,
    activate: rule.enabled,
    sourceRule: rule,
    isLoading: selectedRules?.includes(rule.rule_id) ?? false,
  }));
