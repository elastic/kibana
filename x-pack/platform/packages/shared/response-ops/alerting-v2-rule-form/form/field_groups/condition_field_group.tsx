/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { FieldGroup } from './field_group';
import { EvaluationQueryField } from '../fields/evaluation_query_field';
import { EsqlQuerySplitLegend } from '../fields/esql_query_split_legend';
import { GroupFieldSelect } from '../fields/group_field_select';
import { TimeFieldSelect } from '../fields/time_field_select';

interface ConditionFieldGroupProps {
  /**
   * Whether to include the editable base query field.
   * When true, shows an editable ES|QL editor for the base query.
   * When false, shows the ES|QL split legend (unless omitted — e.g. legend is in a flyout callout).
   */
  includeBase?: boolean;
  /**
   * When true, do not render {@link EsqlQuerySplitLegend} (shown elsewhere, e.g. `EuiCallOut` under the flyout header).
   */
  omitEsqlQuerySplitLegend?: boolean;
}

/**
 * Condition field group for configuring alert trigger conditions.
 *
 * This component displays:
 * - An editable ES|QL query editor (when includeBase is true), or
 * - A legend linking Discover’s BASE / CONDITION highlights to rule semantics (when includeBase is false and not omitted).
 *
 * The full ES|QL query is edited in Discover when includeBase is false; the form does not duplicate it.
 */
export const ConditionFieldGroup = ({
  includeBase = false,
  omitEsqlQuerySplitLegend = false,
}: ConditionFieldGroupProps) => {
  const showInlineLegend = !includeBase && !omitEsqlQuerySplitLegend;

  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.condition', {
        defaultMessage: 'Rule evaluation',
      })}
      flyoutDisplay={omitEsqlQuerySplitLegend ? 'plain' : 'accordion'}
    >
      {includeBase ? (
        <>
          <EvaluationQueryField />
          <EuiSpacer size="m" />
        </>
      ) : (
        showInlineLegend && (
          <>
            <EsqlQuerySplitLegend />
            <EuiSpacer size="m" />
          </>
        )
      )}

      <GroupFieldSelect />
      <TimeFieldSelect />
    </FieldGroup>
  );
};
