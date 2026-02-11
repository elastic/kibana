/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '@kbn/alerting-v2-rule-form';
import { buildRule } from '../utils/build_rule';

interface UseCreateRuleProps {
  http: HttpStart;
  notifications: NotificationsStart;
  onSuccess: () => void;
}

export const useCreateRule = ({ http, notifications, onSuccess }: UseCreateRuleProps) => {
  const { mutate, isLoading } = useMutation(
    (formValues: FormValues) => {
      const ruleData: CreateRuleData = buildRule(formValues);
      return http.post<RuleResponse>('/internal/alerting/v2/rule', {
        body: JSON.stringify(ruleData),
      });
    },
    {
      onSuccess: (data: RuleResponse) => {
        notifications.toasts.addSuccess(`Rule '${data.name}' was created successfully`);
        onSuccess();
      },
      onError: (error: Error) => {
        notifications.toasts.addDanger(`Error creating rule: ${error.message}`);
      },
    }
  );

  return { createRule: mutate, isLoading };
};
