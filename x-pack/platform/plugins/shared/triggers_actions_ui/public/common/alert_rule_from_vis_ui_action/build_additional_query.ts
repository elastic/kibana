/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AlertRuleFromVisUIActionData } from '@kbn/alerts-ui-shared';
import { escapeFieldNameFactory } from './escape_field_name_factory';

export const buildAdditionalQuery = ({
  thresholdValues,
  usesPlaceholderValues,
  xValues,
  query,
}: AlertRuleFromVisUIActionData) => {
  const { escapeFieldName, stringValueToESQLCondition, getRenameQuery } =
    escapeFieldNameFactory(query);
  const thresholdQuery = thresholdValues
    .map(({ values, yField }) => {
      const conditions = Object.entries(values)
        // Always move the Y axis value to the end of the query
        .sort(([sourceField]) => (sourceField === yField ? 1 : -1))
        .map(([sourceField, value]) =>
          sourceField === yField
            ? `${escapeFieldName(sourceField)} >= ${value}`
            : stringValueToESQLCondition(sourceField, value)
        )
        .join(' AND ');
      return thresholdValues.length > 1 && Object.keys(values).length > 1
        ? `(${conditions})`
        : conditions;
    })
    .join(' OR ');
  const thresholdQueryComment = usesPlaceholderValues
    ? i18n.translate('xpack.triggersActionsUI.alertRuleFromVis.thresholdPlaceholderComment', {
        defaultMessage: 'Modify the following conditions to set an alert threshold for this rule:',
      })
    : i18n.translate('xpack.triggersActionsUI.alertRuleFromVis.thresholdComment', {
        defaultMessage:
          'Threshold automatically generated from the selected {thresholdValues, plural, one {value} other {values} } on the chart. This rule will generate an alert based on the following conditions:',
        values: { thresholdValues: Object.keys(thresholdValues).length },
      });

  const xValueQueries = Object.entries(xValues).map(([fieldName, value]) =>
    stringValueToESQLCondition(fieldName, value)
  );

  const conditionsQuery = [
    ...xValueQueries,
    xValueQueries.length && thresholdValues.length > 1 ? `(${thresholdQuery})` : thresholdQuery,
  ].join(' AND ');

  // Generate ES|QL to escape function columns
  let renameQuery = getRenameQuery();
  if (renameQuery.length)
    renameQuery = `// ${i18n.translate('xpack.triggersActionsUI.alertRuleFromVis.renameComment', {
      defaultMessage:
        'Rename the following columns so they can be used as part of the alerting threshold:',
    })}\n${renameQuery}\n`;

  // Combine the escaped columns with the threshold conditions query
  return `${renameQuery}// ${thresholdQueryComment}\n| WHERE ${conditionsQuery}`;
};
