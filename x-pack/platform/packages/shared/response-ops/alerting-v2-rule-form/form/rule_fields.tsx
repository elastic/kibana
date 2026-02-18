/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import type { FormValues } from './types';
import type { RuleFormServices } from './rule_form';
import { RuleExecutionFieldGroup } from './field_groups/rule_execution_field_group';
import { RuleDetailsFieldGroup } from './field_groups/rule_details_field_group';
import { StateTransitionsFieldGroup } from './field_groups/state_transitions_field_group';

/** @deprecated Use RuleFormServices from rule_form.tsx */
export type RuleFieldsServices = RuleFormServices;

export interface RuleFieldsProps {
  services: RuleFieldsServices;
  query: string;
}

export const RuleFields: React.FC<RuleFieldsProps> = ({ services, query }) => {
  const formContext = useFormContext<FormValues>();

  if (!formContext) {
    throw new Error(
      'RuleFields must be used within a FormProvider. ' +
        'If using RuleFields standalone, wrap it with FormProvider from react-hook-form.'
    );
  }

  return (
    <>
      <RuleDetailsFieldGroup />
      <EuiSpacer size="m" />
      <RuleExecutionFieldGroup services={services} />
      <EuiSpacer size="m" />
      <StateTransitionsFieldGroup services={services} />
    </>
  );
};
