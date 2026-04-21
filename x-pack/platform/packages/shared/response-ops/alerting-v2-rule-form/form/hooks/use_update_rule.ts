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
import { mapFormValuesToUpdateRequest } from '../utils/rule_request_mappers';

interface UseUpdateRuleProps {
  http: HttpStart;
  notifications: NotificationsStart;
  ruleId: string;
}

export const useUpdateRule = ({ http, notifications, ruleId }: UseUpdateRuleProps) => {
  const mutation = useMutation(
    (formValues: FormValues) => {
      return http.patch<RuleResponse>(
        `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(ruleId)}`,
        {
          body: JSON.stringify(mapFormValuesToUpdateRequest(formValues)),
        }
      );
    },
    {
      onSuccess: (data: RuleResponse) => {
        notifications.toasts.addSuccess(`Rule '${data.metadata.name}' was updated successfully`);
      },
      onError: (error: Error) => {
        notifications.toasts.addDanger(`Error updating rule: ${error.message}`);
      },
    }
  );

  return {
    ...mutation,
    updateRule: mutation.mutate,
  };
};
