/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { QueryColumn } from '../hooks/use_query_columns';

export interface ReasonTemplateVariable {
  /** What goes between the braces, e.g. `data.host.name` or `rule.name`. */
  expression: string;
  /** Short hint shown next to the suggestion: the column type, or the rule field. */
  detail: string;
}

/**
 * Rule fields the executor exposes under `rule.` when it renders the reason. The server builds the
 * same set (`buildRuleContext` in `reason_template.ts`), so keep both lists in sync.
 */
export const REASON_RULE_VARIABLES: readonly ReasonTemplateVariable[] = [
  {
    expression: 'rule.id',
    detail: i18n.translate('xpack.alertingV2.ruleForm.reasonVariable.ruleId', {
      defaultMessage: 'Rule ID',
    }),
  },
  {
    expression: 'rule.name',
    detail: i18n.translate('xpack.alertingV2.ruleForm.reasonVariable.ruleName', {
      defaultMessage: 'Rule name',
    }),
  },
  {
    expression: 'rule.description',
    detail: i18n.translate('xpack.alertingV2.ruleForm.reasonVariable.ruleDescription', {
      defaultMessage: 'Rule description',
    }),
  },
  {
    expression: 'rule.tags',
    detail: i18n.translate('xpack.alertingV2.ruleForm.reasonVariable.ruleTags', {
      defaultMessage: 'Rule tags (use the join filter to print them)',
    }),
  },
  {
    expression: 'rule.version',
    detail: i18n.translate('xpack.alertingV2.ruleForm.reasonVariable.ruleVersion', {
      defaultMessage: 'Rule version',
    }),
  },
];

// A column such as `host.name` or `@timestamp` can be read with dot access. Anything else (spaces,
// dashes, brackets) needs the bracket form, which the executor also supports: `data["my col"]`.
const DOT_ACCESS_SEGMENT = /^[A-Za-z_@][\w@]*$/;

const toDataExpression = (columnName: string): string =>
  columnName.split('.').every((segment) => DOT_ACCESS_SEGMENT.test(segment))
    ? `data.${columnName}`
    : `data[${JSON.stringify(columnName)}]`;

/** Variables a reason template can use: one `data.*` per output column, plus the `rule.*` set. */
export const buildReasonTemplateVariables = (
  columns: readonly QueryColumn[]
): ReasonTemplateVariable[] => [
  ...columns.map(({ name, type }) => ({ expression: toDataExpression(name), detail: type })),
  ...REASON_RULE_VARIABLES,
];
