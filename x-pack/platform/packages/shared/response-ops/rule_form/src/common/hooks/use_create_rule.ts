/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { HttpStart, IHttpFetchError } from '@kbn/core-http-browser';
import type { CreateRuleBody } from '../apis/create_rule';
import { createRule } from '../apis/create_rule';
import type { Rule } from '../types';

export interface UseCreateRuleProps {
  http: HttpStart;
  onSuccess?: (rule: Rule) => void;
  onError?: (error: IHttpFetchError<{ message: string }>) => void;
}

export const useCreateRule = (props: UseCreateRuleProps) => {
  const { http, onSuccess, onError } = props;

  const mutationFn = ({ formData }: { formData: CreateRuleBody }) => {
    return createRule({
      http,
      rule: formData,
    });
  };

  return useMutation({
    mutationKey: ['useUpdateRule'],
    mutationFn,
    onSuccess,
    onError,
  });
};
