/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import type { HttpStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FormValues } from './types';
import { RuleExecutionFieldGroup } from './field_groups/rule_execution_field_group';
import { RuleDetailsFieldGroup } from './field_groups/rule_details_field_group';
export interface RuleFieldsServices {
  http: HttpStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

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
      <RuleExecutionFieldGroup services={services} query={query} />
    </>
  );
};
