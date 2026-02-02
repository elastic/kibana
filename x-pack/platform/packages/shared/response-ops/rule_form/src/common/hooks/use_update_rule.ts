/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { HttpStart, IHttpFetchError } from '@kbn/core-http-browser';
import type { UpdateRuleBody } from '../apis/update_rule';
import { updateRule } from '../apis/update_rule';
import type { Rule } from '../types';

export interface UseUpdateRuleProps {
  http: HttpStart;
  onSuccess?: (rule: Rule) => void;
  onError?: (error: IHttpFetchError<{ message: string }>) => void;
}

export const useUpdateRule = (props: UseUpdateRuleProps) => {
  const { http, onSuccess, onError } = props;

  const mutationFn = ({ id, formData }: { id: string; formData: UpdateRuleBody }) => {
    return updateRule({
      id,
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
