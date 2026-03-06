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
  onSuccess?: () => void;
}

/**
 * Builds the `recovery_policy.query` portion of the API payload.
 *
 * Two modes:
 * 1. **Condition mode** – The user specified an evaluation condition (WHERE clause)
 *    and wrote a recovery condition. The base query for recovery is the same
 *    evaluation base query.
 * 2. **Full-query mode** – The user wrote a standalone recovery base query
 *    (no evaluation condition was split out).
 */
const buildRecoveryQuery = (
  recoveryPolicy: NonNullable<FormValues['recoveryPolicy']>,
  evaluation: FormValues['evaluation']
): { query: { base: string; condition?: string } } | Record<string, never> => {
  const { query } = recoveryPolicy;

  // Condition-only mode: recovery WHERE clause applied to the evaluation base query
  if (query?.condition) {
    return {
      query: {
        base: query.base || evaluation.query.base,
        condition: query.condition,
      },
    };
  }

  // Full-query mode: user provided a standalone recovery base query
  if (query?.base) {
    return { query: { base: query.base } };
  }

  return {};
};

/**
 * Maps form values to the API request payload.
 * This function serves as the boundary between the form contract (FormValues)
 * and the API contract (CreateRuleData).
 */
const mapFormValuesToCreateRuleData = (formValues: FormValues): CreateRuleData => {
  const {
    kind,
    metadata,
    timeField,
    schedule,
    evaluation,
    grouping,
    recoveryPolicy,
    stateTransition,
  } = formValues;

  const hasStateTransition =
    kind === 'alert' &&
    stateTransition != null &&
    (stateTransition.pendingCount != null || stateTransition.pendingTimeframe != null);

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
        ...(evaluation.query.condition ? { condition: evaluation.query.condition } : {}),
      },
    },
    ...(grouping?.fields?.length ? { grouping: { fields: grouping.fields } } : {}),
    ...(recoveryPolicy
      ? {
          recovery_policy: {
            type: recoveryPolicy.type,
            ...(recoveryPolicy.type === 'query'
              ? buildRecoveryQuery(recoveryPolicy, evaluation)
              : {}),
          },
        }
      : {}),
    ...(hasStateTransition
      ? {
          state_transition: {
            pending_count: stateTransition!.pendingCount,
            ...(stateTransition!.pendingTimeframe != null
              ? { pending_timeframe: stateTransition!.pendingTimeframe }
              : {}),
          },
        }
      : {}),
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
        onSuccess?.();
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
