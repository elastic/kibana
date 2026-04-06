/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiFormRow, EuiCodeBlock } from '@elastic/eui';
import { useFormContext, useWatch } from 'react-hook-form';
import type { FormValues } from '../types';
import { FieldGroup } from './field_group';
import { WhereClauseEditor } from '../fields/where_clause_editor';
import { EvaluationQueryField } from '../fields/evaluation_query_field';
import { GroupFieldSelect } from '../fields/group_field_select';
import { TimeFieldSelect } from '../fields/time_field_select';

interface ConditionFieldGroupProps {
  /**
   * Whether to include the editable base query field.
   * When true, shows an editable ES|QL editor for the base query.
   * When false, shows the base query as read-only (if available).
   */
  includeBase?: boolean;
}

/**
 * Condition field group for configuring alert trigger conditions.
 *
 * This component displays:
 * - An editable ES|QL query editor (when includeQuery is true) OR a read-only view of the base query
 * - An editable WHERE clause condition field
 *
 * The base query defines what data is being evaluated, while the
 * condition field defines the threshold or filter that triggers alerts.
 */
export const ConditionFieldGroup = ({ includeBase = false }: ConditionFieldGroupProps) => {
  const { control } = useFormContext<FormValues>();

  // Read the base query from form state (initialized via useFormDefaults)
  const baseQuery = useWatch({ control, name: 'evaluation.query.base' });

  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.condition', {
        defaultMessage: 'Rule evaluation',
      })}
    >
      {includeBase ? (
        // Editable base query
        <>
          <EvaluationQueryField />
          <EuiSpacer size="m" />
        </>
      ) : (
        // Read-only base query (only show if there's a query to display)
        baseQuery && (
          <>
            <EuiFormRow
              label={i18n.translate('xpack.alertingV2.ruleForm.baseQueryLabel', {
                defaultMessage: 'Base query',
              })}
              fullWidth
            >
              <EuiCodeBlock language="esql" fontSize="m" paddingSize="m" isCopyable>
                {baseQuery}
              </EuiCodeBlock>
            </EuiFormRow>
            <EuiSpacer size="m" />
          </>
        )
      )}

      <WhereClauseEditor
        name="evaluation.query.condition"
        label={i18n.translate('xpack.alertingV2.ruleForm.conditionLabel', {
          defaultMessage: 'Trigger condition',
        })}
        labelTooltip={i18n.translate('xpack.alertingV2.ruleForm.conditionTooltip', {
          defaultMessage:
            'A trigger condition filters when alerts are created. If no condition is specified, an alert will be created for every result returned by the base query.',
        })}
        helpText={
          !baseQuery
            ? i18n.translate('xpack.alertingV2.ruleForm.conditionDisabledHelp', {
                defaultMessage: 'Define a base query first to enable the condition editor.',
              })
            : undefined
        }
        baseQuery={baseQuery || ''}
        disabled={!baseQuery}
        fullWidth={true}
      />
      <GroupFieldSelect />
      <TimeFieldSelect />
    </FieldGroup>
  );
};
