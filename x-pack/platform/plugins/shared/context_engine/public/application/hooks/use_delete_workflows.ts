/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useCallback } from 'react';
import { getErrorMessage } from '../utils/get_error_message';
import { useKibana } from './use_kibana';

/**
 * Deletes workflows that are no longer referenced by any AI index automation.
 * Failures are surfaced as a toast rather than thrown, since callers use this
 * after the reference is already removed and persisted elsewhere.
 */
export const useDeleteWorkflows = () => {
  const api = useWorkflowsApi();
  const {
    services: { notifications },
  } = useKibana();

  const deleteWorkflows = useCallback(
    async (ids: string[]): Promise<void> => {
      if (ids.length === 0) {
        return;
      }
      try {
        await api.bulkDeleteWorkflows(ids);
      } catch (error) {
        const toastMessage = getErrorMessage(error);
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.contextEngine.deleteWorkflows.errorTitle', {
            defaultMessage: 'Unable to delete workflow',
          }),
          ...(toastMessage ? { toastMessage } : {}),
        });
      }
    },
    [api, notifications]
  );

  return { deleteWorkflows };
};
