/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import { useForm } from 'react-hook-form';
import type { EsqlToolFormData } from '../../components/tools/form/types/tool_form_types';
import { useEsqlToolFormValidationResolver } from '../../components/tools/form/validation/tool_form_validation';

const getDefaultValues = (): EsqlToolFormData => ({
  toolId: '',
  description: '',
  esql: '',
  labels: [],
  params: [],
  type: ToolType.esql,
});

export const useEsqlToolForm = () => {
  const resolver = useEsqlToolFormValidationResolver();
  const form = useForm<EsqlToolFormData>({
    defaultValues: getDefaultValues(),
    resolver,
    mode: 'onBlur',
  });
  return form;
};
