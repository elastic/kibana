/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError } from '@kbn/core/public';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';

/**
 * Mirrors `RULE_ALREADY_RUNNING` / `RULE_RUN_CONFLICT` in
 * `server/lib/errors/error_codes.ts` (`code` is documented there as "safe
 * for clients to branch on"). Both mean the rule itself is fine — it's just
 * not newly running yet — so they get a softer warning toast instead of the
 * generic danger one.
 */
const getErrorCode = (error: unknown): string | undefined =>
  (error as IHttpFetchError<{ code?: string }> | undefined)?.body?.code;

export const useRunRule = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useMutation({
    mutationFn: ({ id }: { id: string }) => rulesApi.runRule(id),
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.hooks.useRunRule.successMessage', {
          defaultMessage: 'Rule run started',
        })
      );
    },
    onError: (error) => {
      const errorCode = getErrorCode(error);
      if (errorCode === 'RULE_ALREADY_RUNNING' || errorCode === 'RULE_RUN_CONFLICT') {
        toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useRunRule.conflictMessage', {
            defaultMessage: 'Could not start the run, please try again',
          })
        );
        return;
      }
      toasts.addDanger(
        i18n.translate('xpack.alertingV2.hooks.useRunRule.errorMessage', {
          defaultMessage: 'Failed to run rule',
        })
      );
    },
  });
};
