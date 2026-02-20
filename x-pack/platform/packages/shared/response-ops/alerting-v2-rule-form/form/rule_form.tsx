/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiForm, EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FormValues } from './types';
import { RuleExecutionFieldGroup } from './field_groups/rule_execution_field_group';
import { RuleDetailsFieldGroup } from './field_groups/rule_details_field_group';
import { EvaluationQueryField } from './fields/evaluation_query_field';
import { ErrorCallOut } from '../flyout/error_callout';

export interface RuleFormServices {
  http: HttpStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export interface RuleFormProps {
  formId: string;
  services: RuleFormServices;
  onSubmit: (values: FormValues) => void;
  /** Whether to include the ES|QL query editor (default: true) */
  includeQueryEditor?: boolean;
}

/**
 * Stateless rule form component.
 *
 * This component renders form fields and expects a FormProvider context to exist.
 * It does not manage form state - that responsibility belongs to the parent component
 * (DynamicRuleForm or StandaloneRuleForm).
 */
export const RuleForm: React.FC<RuleFormProps> = ({
  formId,
  services,
  onSubmit,
  includeQueryEditor = true,
}) => {
  const { handleSubmit } = useFormContext<FormValues>();

  return (
    <EuiForm id={formId} component="form" onSubmit={handleSubmit(onSubmit)}>
      <ErrorCallOut />
      <RuleDetailsFieldGroup />
      <EuiSpacer size="m" />
      {includeQueryEditor && (
        <>
          <EvaluationQueryField />
          <EuiSpacer size="m" />
        </>
      )}
      <RuleExecutionFieldGroup services={services} />
    </EuiForm>
  );
};
