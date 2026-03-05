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
import { ErrorCallOut } from '../flyout/error_callout';
import { RuleFormServicesProvider, type RuleFormServices } from './contexts';
import { AttacmentRunbookGroup } from './field_groups/attachment_runbook_group';

export type { RuleFormServices } from './contexts';

export interface RuleFormProps {
  /** Form ID for submission */
  formId: string;
  /** Services required for form fields */
  services: RuleFormServices;
  /** Submit handler */
  onSubmit: (values: FormValues) => void;
}

/**
 * Stateless rule form component.
 *
 * This component renders form fields and expects a FormProvider context to exist.
 * It does not manage form state - that responsibility belongs to the parent component
 * (DynamicRuleForm or StandaloneRuleForm).
 *
 * Services are provided via RuleFormServicesProvider context, eliminating prop drilling.
 */
export const RuleForm: React.FC<RuleFormProps> = ({ formId, services, onSubmit }) => {
  const { handleSubmit } = useFormContext<FormValues>();

  return (
    <RuleFormServicesProvider services={services}>
      <EuiForm id={formId} component="form" onSubmit={handleSubmit(onSubmit)}>
        <ErrorCallOut />
        <RuleDetailsFieldGroup />
        <EuiSpacer size="m" />
        <RuleExecutionFieldGroup />
        <EuiSpacer size="m" />
        <AttacmentRunbookGroup />
      </EuiForm>
    </RuleFormServicesProvider>
  );
};
