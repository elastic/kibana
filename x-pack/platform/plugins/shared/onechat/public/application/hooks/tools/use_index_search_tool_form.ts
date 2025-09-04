/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useForm } from 'react-hook-form';
import { useIndexSearchToolFormValidationResolver } from '../../components/tools/index_search/form/validation/index_search_tool_form_validation';
import type { OnechatIndexSearchToolFormData } from '../../components/tools/index_search/form/types/index_search_tool_form_types';

const getDefaultValues = (): OnechatIndexSearchToolFormData => ({
  name: '',
  description: '',
  pattern: '',
  tags: [],
});

export const useIndexSearchToolForm = () => {
  const resolver = useIndexSearchToolFormValidationResolver();
  const form = useForm<OnechatIndexSearchToolFormData>({
    defaultValues: getDefaultValues(),
    resolver,
    mode: 'onBlur',
  });
  return form;
};
