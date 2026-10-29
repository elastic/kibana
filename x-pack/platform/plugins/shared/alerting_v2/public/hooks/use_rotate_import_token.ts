/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import type { ImportCredentialsResponse } from '@kbn/alerting-v2-schemas';
import { ImportsApi } from '../services/imports_api';

/** POC: the new token is returned once. The caller must show it, it cannot be read again. */
export const useRotateImportToken = () => {
  const importsApi = useService(ImportsApi);
  const { toasts } = useService(CoreStart('notifications'));

  return useMutation<ImportCredentialsResponse, Error, string>({
    mutationFn: (id) => importsApi.rotateImportToken(id),
    onError: (error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.alertingV2.imports.rotateError', {
          defaultMessage: 'Failed to rotate the token',
        }),
      });
    },
  });
};
