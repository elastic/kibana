/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/alerting-v2-schemas';

export const CREATE_RULE_ERROR_TITLE = i18n.translate(
  'xpack.alertingV2.hooks.useCreateRule.errorMessage',
  {
    defaultMessage: 'Rule not created',
  }
);

export const UPDATE_RULE_ERROR_TITLE = i18n.translate(
  'xpack.alertingV2.hooks.useUpdateRule.errorMessage',
  {
    defaultMessage: 'Edits not saved',
  }
);

/**
 * Overrides the default create/update rule error toast. Call `showDefaultToast`
 * to fall back to the enriched addError toast for statuses the caller does not
 * handle. `query` is the mutation payload's query (what was just submitted).
 *
 * Temporary escape hatch for compose-discover save UX; prefer removing once
 * conditionless alert queries are saveable again.
 */
export type OnRuleMutationErrorToast = (
  error: Error,
  showDefaultToast: () => void,
  query?: Query
) => void;

export const runRuleMutationErrorToast = (
  onErrorToast: OnRuleMutationErrorToast | undefined,
  error: Error,
  showDefaultToast: () => void,
  query?: Query
): void => {
  if (onErrorToast) {
    onErrorToast(error, showDefaultToast, query);
    return;
  }
  showDefaultToast();
};
