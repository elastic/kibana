/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiSpacer, EuiFormRow, EuiCodeBlock } from '@elastic/eui';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { FormValues } from '../types';
import { FieldGroup } from './field_group';
import { WhereClauseEditor } from '../fields/where_clause_editor';
import { EvaluationQueryField } from '../fields/evaluation_query_field';

interface ConditionFieldGroupProps {
  /** Search service for fetching available columns from the query */
  search: ISearchStart['search'];
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
export const ConditionFieldGroup: React.FC<ConditionFieldGroupProps> = ({
  search,
  includeBase = false,
}) => {
  const { control } = useFormContext<FormValues>();

  // Read the base query from form state (initialized via useFormDefaults)
  const baseQuery = useWatch({ control, name: 'evaluation.query.base' });

  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.ruleForm.condition', {
        defaultMessage: 'Rule evaluation',
      })}
    >
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.alertingV2.ruleForm.conditionDescription', {
          defaultMessage:
            'The condition determines when this rule should trigger an alert. Define a WHERE clause condition (e.g., count > 100).',
        })}
      </EuiText>
      <EuiSpacer size="m" />

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
        helpText={
          !baseQuery
            ? i18n.translate('xpack.alertingV2.ruleForm.conditionDisabledHelp', {
                defaultMessage: 'Define a base query first to enable the condition editor.',
              })
            : undefined
        }
        services={{ search }}
        baseQuery={baseQuery || ''}
        disabled={!baseQuery}
        fullWidth={true}
      />
    </FieldGroup>
  );
};
