/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiForm, EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import type { FormValues } from './types';
import { RuleExecutionFieldGroup } from './field_groups/rule_execution_field_group';
import { RuleDetailsFieldGroup } from './field_groups/rule_details_field_group';
import { ConditionFieldGroup } from './field_groups/condition_field_group';
import { AlertConditionsFieldGroup } from './field_groups/alert_conditions_field_group';
import { RULE_FORM_ID } from './constants';
import { KindField } from './fields/kind_field';
import { AttachmentRunbookFieldGroup } from './field_groups/attachment_runbook_field_group';

export interface GuiRuleFormProps {
  onSubmit: (values: FormValues) => void;
  /** Whether to include the ES|QL query editor (default: true) */
  includeQueryEditor?: boolean;
  /** Whether to show the kind field (alert vs signal toggle). Default: true. */
  includeKindField?: boolean;
  /** Whether to show the alert conditions section (delay, recovery). Default: true. */
  includeAlertConditions?: boolean;
  /** Content rendered before the standard form fields (inside the form column). */
  prependContent?: React.ReactNode;
  /** Override the default "Group Fields" label on the group-by selector. */
  groupFieldLabel?: string;
}

/**
 * GUI-based rule form with standard form fields.
 *
 * This component renders the visual form interface with field groups for:
 * - Rule details (name, tags, description — no wrapper panel)
 * - Rule evaluation (full ES|QL query)
 * - Rule execution settings (schedule, lookback)
 * - Rule kind (alert vs monitor) — hidden when `includeKindField` is false
 * - Alert conditions (alert delay, recovery policy, recovery delay) — hidden when `includeAlertConditions` is false
 *
 * Requires a FormProvider context with FormValues type to be present in the component tree.
 */
export const GuiRuleForm = ({
  onSubmit,
  includeQueryEditor = true,
  includeKindField = true,
  includeAlertConditions = true,
  prependContent,
  groupFieldLabel,
}: GuiRuleFormProps) => {
  const { handleSubmit } = useFormContext<FormValues>();

  return (
    <EuiForm id={RULE_FORM_ID} component="form" onSubmit={handleSubmit(onSubmit)}>
      {prependContent && (
        <>
          {prependContent}
          <EuiSpacer size="m" />
        </>
      )}
      <RuleDetailsFieldGroup />
      <EuiSpacer size="m" />
      <ConditionFieldGroup includeBase={includeQueryEditor} groupFieldLabel={groupFieldLabel} />
      <EuiSpacer size="m" />
      <RuleExecutionFieldGroup />
      {includeKindField && (
        <>
          <EuiSpacer size="m" />
          <KindField />
        </>
      )}
      {includeAlertConditions && (
        <>
          <EuiSpacer size="m" />
          <AlertConditionsFieldGroup />
        </>
      )}
      <EuiSpacer size="m" />
      <AttachmentRunbookFieldGroup />
    </EuiForm>
  );
};
