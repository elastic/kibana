/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Rule } from '../../../../containers/detection_engine/rules/types';
import { ColumnTypes } from './index';

export const formatRules = (rules: Rule[]): ColumnTypes[] =>
  rules.map(rule => ({
    id: rule.id,
    rule: {
      href: `#/detection-engine/rules/rule-details/${rule.id}`,
      name: rule.name,
      status: 'Status Placeholder',
    },
    method: rule.alertTypeParams.type, // Map to i18n
    severity: rule.alertTypeParams.severity,
    lastCompletedRun: '--', // Frank Plumber
    lastResponse: {
      type: '--', // Frank Plumber
    },
    tags: rule.alertTypeParams.tags,
    activate: rule.enabled,
    sourceRule: rule,
    isLoading: false,
  }));
