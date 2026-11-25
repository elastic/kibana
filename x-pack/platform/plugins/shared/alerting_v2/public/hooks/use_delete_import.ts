/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH } from '@kbn/alerting-v2-constants';
import { importKeys } from './query_key_factory';

/** Deletes an external source, which also deletes its connector. */
export const deleteImport = async (http: HttpStart, id: string): Promise<void> => {
  await http.delete(`${ALERTING_V2_INTERNAL_EXTERNAL_SOURCE_API_PATH}/${encodeURIComponent(id)}`);
};

/** Deletes an import, then refreshes the imports list. */
export const useDeleteImport = () => {
  const http = useService(CoreStart('http'));
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteImport(http, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.lists(), exact: false });
      toasts.addSuccess(
        i18n.translate('xpack.alertingV2.imports.delete.success', {
          defaultMessage: 'Import deleted',
        })
      );
    },
    onError: (error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.imports.delete.error', {
          defaultMessage: 'Failed to delete import',
        }),
      });
    },
  });
};
