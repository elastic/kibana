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
import { archiveMaintenanceWindow } from '../services/archive';

export function useFinishAndArchiveMaintenanceWindow() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = async (maintenanceWindowId: string) => {
    await finishMaintenanceWindow({ http, maintenanceWindowId });
    return archiveMaintenanceWindow({ http, maintenanceWindowId, archive: true });
  };

  return useMutation(mutationFn, {
    onSuccess: (data) => {
      toasts.addSuccess(
        i18n.translate('xpack.maintenanceWindows.finishedAndArchiveSuccess', {
          defaultMessage: "Cancelled and archived running maintenance window ''{title}''",
          values: {
            title: data.title,
          },
        })
      );
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.maintenanceWindows.finishedAndArchiveFailure', {
          defaultMessage: 'Failed to cancel and archive maintenance window.',
        })
      );
    },
  });
}
