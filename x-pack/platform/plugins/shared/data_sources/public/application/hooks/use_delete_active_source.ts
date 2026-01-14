/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';
import { API_BASE_PATH } from '../../../common/constants';
import { queryKeys } from '../query_keys';

export const useDeleteActiveSource = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const {
    services: { http, notifications },
  } = useKibana();
  const toasts = notifications?.toasts;

  return useMutation(
    async (id: string) => {
      return await http.delete<{ success: boolean }>(`${API_BASE_PATH}/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(queryKeys.dataSources.list());
        toasts?.addSuccess({
          title: i18n.translate('xpack.dataSources.deleteActiveSource.successToast', {
            defaultMessage: 'Data source deleted successfully',
          }),
        });
        onSuccess?.();
      },
      onError: (error: { body: KibanaServerError }) => {
        toasts?.addError(new Error(error.body?.message || 'Unknown error'), {
          title: i18n.translate('xpack.dataSources.deleteActiveSource.errorToast', {
            defaultMessage: 'Failed to delete data source',
          }),
          toastMessage: error.body?.message,
        });
      },
    }
  );
};
