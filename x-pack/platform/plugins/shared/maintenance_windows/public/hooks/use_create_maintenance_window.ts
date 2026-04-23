/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/public';

import { useKibana } from '../utils/kibana_react';
import type { CreateParams } from '../services/create';
import { createMaintenanceWindow } from '../services/create';

const onErrorWithMessage = (message: string) =>
  i18n.translate('xpack.maintenanceWindows.createFailureWithMessage', {
    defaultMessage: 'Failed to create maintenance window: {message}',
    values: { message },
  });

const onErrorWithoutMessage = i18n.translate(
  'xpack.maintenanceWindows.createFailureWithoutMessage',
  {
    defaultMessage: 'Failed to create maintenance window',
  }
);

interface UseCreateMaintenanceWindowProps {
  onError?: (error: IHttpFetchError<KibanaServerError>) => void;
}

export function useCreateMaintenanceWindow(props?: UseCreateMaintenanceWindowProps) {
  const { onError } = props || {};

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = (createParams: CreateParams) => {
    return createMaintenanceWindow({ http, createParams });
  };

  return useMutation(mutationFn, {
    onSuccess: (data) => {
      toasts.addSuccess(
        i18n.translate('xpack.maintenanceWindows.createSuccess', {
          defaultMessage: "Created maintenance window ''{title}''",
          values: {
            title: data.title,
          },
        })
      );
    },
    onError: (error: IHttpFetchError<KibanaServerError>) => {
      const getDefaultErrorMessage = (message?: string): string =>
        !message ? onErrorWithoutMessage : onErrorWithMessage(message);

      toasts.addDanger(
        getDefaultErrorMessage(error.body?.statusCode === 400 ? error.body?.message : '')
      );
      onError?.(error);
    },
  });
}
