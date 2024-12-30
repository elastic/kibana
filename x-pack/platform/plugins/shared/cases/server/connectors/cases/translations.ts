/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASE_CREATED_BY_RULE_DESC = (ruleName: string) =>
  i18n.translate('xpack.cases.caseAction.caseCreatedByRuleDesc', {
    defaultMessage: 'This case was created by the rule {ruleName}',
    values: {
      ruleName,
    },
  });

export const GROUPED_BY_DESC = (groupingDescription: string) =>
  i18n.translate('xpack.cases.caseAction.groupedByDesc', {
    defaultMessage: 'The assigned alerts are grouped by {groupingDescription}',
    values: {
      groupingDescription,
    },
  });

export const GROUPED_BY_TITLE = (groupingDescription: string) =>
  i18n.translate('xpack.cases.caseAction.groupedByTitle', {
    defaultMessage: 'Grouping by {groupingDescription}',
    values: {
      groupingDescription,
    },
  });

export const AUTO_CREATED_TITLE = i18n.translate('xpack.cases.caseAction.autoCreatedTitle', {
  defaultMessage: 'Auto-created',
});
