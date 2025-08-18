/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useForm } from 'react-hook-form';
import { useEsqlToolFormValidationResolver } from '../../components/tools/esql/form/validation/esql_tool_form_validation';
import type { OnechatEsqlToolFormData } from '../../components/tools/esql/form/types/esql_tool_form_types';

const getDefaultValues = (): OnechatEsqlToolFormData => ({
  name: '',
  description: '',
  esql: '',
  tags: [],
  params: [],
});

export const useEsqlToolForm = () => {
  const resolver = useEsqlToolFormValidationResolver();
  const form = useForm<OnechatEsqlToolFormData>({
    defaultValues: getDefaultValues(),
    resolver,
    mode: 'onBlur',
  });
  return form;
};
