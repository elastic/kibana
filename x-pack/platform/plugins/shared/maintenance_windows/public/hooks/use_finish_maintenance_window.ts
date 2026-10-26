/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';

import { useKibana } from '../utils/kibana_react';
import { finishMaintenanceWindow } from '../services/finish';

export function useFinishMaintenanceWindow() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = (maintenanceWindowId: string) => {
    return finishMaintenanceWindow({ http, maintenanceWindowId });
  };

  return useMutation(mutationFn, {
    onSuccess: (data) => {
      toasts.addSuccess(
        i18n.translate('xpack.maintenanceWindows.finishedSuccess', {
          defaultMessage: "Cancelled running maintenance window ''{title}''",
          values: {
            title: data.title,
          },
        })
      );
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.maintenanceWindows.finishedFailure', {
          defaultMessage: 'Failed to cancel maintenance window.',
        })
      );
    },
  });
}
