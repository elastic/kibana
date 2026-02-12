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

interface UseUpdateRuleProps {
  http: HttpStart;
  notifications: NotificationsStart;
  onSuccess: () => void;
}

interface UpdateRuleVariables {
  id: string;
  formValues: FormValues;
}

export const useUpdateRule = ({ http, notifications, onSuccess }: UseUpdateRuleProps) => {
  const { mutate, isLoading } = useMutation(
    ({ id, formValues }: UpdateRuleVariables) => {
      const ruleData: CreateRuleData = buildRule(formValues);
      return http.patch<RuleResponse>(`/internal/alerting/v2/rule/${id}`, {
        body: JSON.stringify(ruleData),
      });
    },
    {
      onSuccess: (data: RuleResponse) => {
        notifications.toasts.addSuccess(`Rule '${data.name}' was updated successfully`);
        onSuccess();
      },
      onError: (error: Error) => {
        notifications.toasts.addDanger(`Error updating rule: ${error.message}`);
      },
    }
  );

  return { updateRule: mutate, isLoading };
};
