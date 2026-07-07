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
  /**
   * `variables` is the same object passed to `mutate` (i.e. `{ formData }`), so callers can
   * access the request payload -- e.g. `ruleTypeId`, `params`, `artifacts` -- alongside the
   * created rule returned by the API, without having to track it separately.
   */
  onSuccess?: (rule: Rule, variables: { formData: CreateRuleBody }) => void;
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
