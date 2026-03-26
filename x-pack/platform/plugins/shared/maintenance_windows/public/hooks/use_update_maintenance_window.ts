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
import type { MaintenanceWindowUI } from '../../common';

import { useKibana } from '../utils/kibana_react';
import type { UpdateParams } from '../services/update';
import { updateMaintenanceWindow } from '../services/update';

interface UseUpdateMaintenanceWindowProps {
  onError?: (error: IHttpFetchError<KibanaServerError>) => void;
}

export function useUpdateMaintenanceWindow(props?: UseUpdateMaintenanceWindowProps) {
  const { onError } = props || {};

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = ({
    maintenanceWindowId,
    updateParams,
  }: {
    maintenanceWindowId: string;
    updateParams: UpdateParams;
  }) => {
    return updateMaintenanceWindow({ http, maintenanceWindowId, updateParams });
  };

  return useMutation(mutationFn, {
    onSuccess: (variables: MaintenanceWindowUI) => {
      toasts.addSuccess(
        i18n.translate('xpack.maintenanceWindows.updateSuccess', {
          defaultMessage: "Updated maintenance window ''{title}''",
          values: {
            title: variables.title,
          },
        })
      );
    },
    onError: (error: IHttpFetchError<KibanaServerError>) => {
      toasts.addDanger(
        i18n.translate('xpack.maintenanceWindows.updateFailure', {
          defaultMessage: 'Failed to update maintenance window.',
        })
      );
      onError?.(error);
    },
  });
}
