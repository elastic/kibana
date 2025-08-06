/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { OnechatEsqlToolFormData } from '../components/tools/esql/form/types/esql_tool_form_types';
import { useEsqlToolFormValidationResolver } from '../components/tools/esql/form/validation/esql_tool_form_validation';

const getDefaultValues = (): OnechatEsqlToolFormData => ({
  name: '',
  description: '',
  esql: '',
  tags: [],
  params: [],
});

export const ToolFormProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const resolver = useEsqlToolFormValidationResolver();
  const form = useForm<OnechatEsqlToolFormData>({
    defaultValues: getDefaultValues(),
    resolver,
    mode: 'onBlur',
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

export const useToolForm = () => {
  const resolver = useEsqlToolFormValidationResolver();
  const form = useForm<OnechatEsqlToolFormData>({
    defaultValues: getDefaultValues(),
    resolver,
    mode: 'onBlur',
  });
  return form;
};
