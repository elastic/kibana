/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError, IToasts } from '@kbn/core/public';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { BULK_FILTER_MAX_RULES } from '@kbn/alerting-v2-schemas';
import { RulesApi, type BulkOperationParams } from '../services/rules_api';
import { ruleKeys } from './query_key_factory';

const getHttpFetchErrorMessage = (error: unknown): string | undefined => {
  const httpError = error as IHttpFetchError<{ message?: string }>;
  return httpError.body?.message;
};

const addBulkMutationDangerToast = (
  toasts: Pick<IToasts, 'addDanger'>,
  title: string,
  error: unknown
) => {
  const serverMessage = getHttpFetchErrorMessage(error);
  if (serverMessage) {
    toasts.addDanger({ title, text: serverMessage });
  } else {
    toasts.addDanger(title);
  }
};

export const useBulkEnableRules = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: BulkOperationParams) => rulesApi.bulkEnableRules(params),
    onSuccess: (data) => {
      if (data.truncated) {
        toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkEnableRules.truncatedFilterMessage', {
            defaultMessage: 'Enable applied to the first {maxRules, number} rules only.',
            values: {
              maxRules: BULK_FILTER_MAX_RULES,
            },
          })
        );
      }
      if (data.errors.length > 0) {
        toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkEnableRules.partialSuccessMessage', {
            defaultMessage:
              'Bulk enable completed with {errorCount, plural, one {# error} other {# errors}}',
            values: { errorCount: data.errors.length },
          })
        );
      } else if (!data.truncated) {
        toasts.addSuccess(
          i18n.translate('xpack.alertingV2.hooks.useBulkEnableRules.successMessage', {
            defaultMessage: 'Rules enabled successfully',
          })
        );
      }
      queryClient.invalidateQueries(ruleKeys.lists());
    },
    onError: (error) => {
      addBulkMutationDangerToast(
        toasts,
        i18n.translate('xpack.alertingV2.hooks.useBulkEnableRules.errorTitle', {
          defaultMessage: 'Failed to enable rules',
        }),
        error
      );
    },
  });
};

export const useBulkDisableRules = () => {
  const rulesApi = useService(RulesApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: BulkOperationParams) => rulesApi.bulkDisableRules(params),
    onSuccess: (data) => {
      if (data.truncated) {
        toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkDisableRules.truncatedFilterMessage', {
            defaultMessage: 'Disable applied to the first {maxRules, number} rules only.',
            values: {
              maxRules: BULK_FILTER_MAX_RULES,
            },
          })
        );
      }
      if (data.errors.length > 0) {
        toasts.addWarning(
          i18n.translate('xpack.alertingV2.hooks.useBulkDisableRules.partialSuccessMessage', {
            defaultMessage:
              'Bulk disable completed with {errorCount, plural, one {# error} other {# errors}}',
            values: { errorCount: data.errors.length },
          })
        );
      } else if (!data.truncated) {
        toasts.addSuccess(
          i18n.translate('xpack.alertingV2.hooks.useBulkDisableRules.successMessage', {
            defaultMessage: 'Rules disabled successfully',
          })
        );
      }
      queryClient.invalidateQueries(ruleKeys.lists());
    },
    onError: (error) => {
      addBulkMutationDangerToast(
        toasts,
        i18n.translate('xpack.alertingV2.hooks.useBulkDisableRules.errorTitle', {
          defaultMessage: 'Failed to disable rules',
        }),
        error
      );
    },
  });
};
