/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import type { FormValues } from '../types';
import { mapFormValuesToCreateRequest } from '../utils/rule_request_mappers';

interface UseCreateRuleProps {
  http: HttpStart;
  notifications: NotificationsStart;
}

export const useCreateRule = ({ http, notifications }: UseCreateRuleProps) => {
  const mutation = useMutation(
    (formValues: FormValues) => {
      return http.post<RuleResponse>(ALERTING_V2_RULE_API_PATH, {
        body: JSON.stringify(mapFormValuesToCreateRequest(formValues)),
      });
    },
    {
      onSuccess: (data: RuleResponse) => {
        notifications.toasts.addSuccess(`Rule '${data.metadata.name}' was created successfully`);
      },
      onError: (error: Error) => {
        notifications.toasts.addDanger(`Error creating rule: ${error.message}`);
      },
    }
  );

  return {
    ...mutation,
    createRule: mutation.mutate,
  };
};
