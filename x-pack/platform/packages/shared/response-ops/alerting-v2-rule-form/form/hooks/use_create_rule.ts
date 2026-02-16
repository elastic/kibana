/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';

interface UseCreateRuleProps {
  http: HttpStart;
  notifications: NotificationsStart;
  onSuccess: () => void;
}

/**
 * Maps form values to the API request payload.
 * This function serves as the boundary between the form contract (FormValues)
 * and the API contract (CreateRuleData).
 */
const mapFormValuesToCreateRuleData = (formValues: FormValues): CreateRuleData => {
  const { kind, metadata, timeField, schedule, evaluation, grouping } = formValues;

  return {
    kind,
    time_field: timeField,
    metadata: {
      name: metadata.name,
      owner: metadata.owner,
      labels: metadata.labels,
    },
    schedule: {
      every: schedule.every,
      lookback: schedule.lookback,
    },
    evaluation: {
      query: {
        base: evaluation.query.base,
        condition: '', // Required by API but not in form yet
      },
    },
    ...(grouping?.fields?.length ? { grouping: { fields: grouping.fields } } : {}),
  };
};

export const useCreateRule = ({ http, notifications, onSuccess }: UseCreateRuleProps) => {
  const mutation = useMutation(
    (formValues: FormValues) => {
      const ruleData = mapFormValuesToCreateRuleData(formValues);
      return http.post<RuleResponse>('/internal/alerting/v2/rule', {
        body: JSON.stringify(ruleData),
      });
    },
    {
      onSuccess: (data: RuleResponse) => {
        notifications.toasts.addSuccess(`Rule '${data.metadata.name}' was created successfully`);
        onSuccess();
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
