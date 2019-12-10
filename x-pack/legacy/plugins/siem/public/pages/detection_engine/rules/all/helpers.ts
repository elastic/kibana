/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Rule } from '../../../../containers/detection_engine/rules/types';
import { TableData } from '../types';
import { getEmptyValue } from '../../../../components/empty_value';

export const formatRules = (rules: Rule[], selectedIds?: string[]): TableData[] =>
  rules.map(rule => ({
    id: rule.id,
    rule_id: rule.rule_id,
    rule: {
      href: `#/detection-engine/rules/${encodeURIComponent(rule.id)}`,
      name: rule.name,
      status: 'Status Placeholder',
    },
    method: rule.type, // TODO: Map to i18n?
    severity: rule.severity,
    lastCompletedRun: undefined, // TODO: Not available yet
    lastResponse: {
      type: getEmptyValue(), // TODO: Not available yet
    },
    tags: rule.tags ?? [],
    activate: rule.enabled,
    sourceRule: rule,
    isLoading: selectedIds?.includes(rule.id) ?? false,
  }));
