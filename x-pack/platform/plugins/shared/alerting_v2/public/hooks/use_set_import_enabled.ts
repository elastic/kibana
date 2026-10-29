/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { ImportResponse } from '@kbn/alerting-v2-schemas';
import { ImportsApi } from '../services/imports_api';
import { importKeys } from './query_key_factory';

export interface SetImportEnabledVariables {
  id: string;
  enabled: boolean;
}

/** POC: enabling or disabling an import also toggles its workflow on the server. */
export const useSetImportEnabled = () => {
  const importsApi = useService(ImportsApi);
  const { toasts } = useService(CoreStart('notifications'));
  const queryClient = useQueryClient();

  return useMutation<ImportResponse, Error, SetImportEnabledVariables>({
    mutationFn: ({ id, enabled }) => importsApi.updateImport(id, { enabled }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: importKeys.all, exact: false });
      toasts.addSuccess(
        updated.enabled
          ? i18n.translate('xpack.alertingV2.imports.enableSuccess', {
              defaultMessage: '{name} enabled',
              values: { name: updated.name },
            })
          : i18n.translate('xpack.alertingV2.imports.disableSuccess', {
              defaultMessage: '{name} disabled',
              values: { name: updated.name },
            })
      );
    },
    onError: (error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.imports.updateError', {
          defaultMessage: 'Failed to update the import',
        }),
      });
    },
  });
};
