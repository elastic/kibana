/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import { useKibana } from '../utils/kibana_react';
import { deleteMaintenanceWindow } from '../services/delete';

export const useDeleteMaintenanceWindow = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = ({ maintenanceWindowId }: { maintenanceWindowId: string }) => {
    return deleteMaintenanceWindow({ http, maintenanceWindowId });
  };

  return useMutation(mutationFn, {
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.maintenanceWindows.deleteSuccess', {
          defaultMessage: 'Deleted maintenance window',
        })
      );
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.maintenanceWindows.deleteFailure', {
          defaultMessage: 'Failed to delete maintenance window.',
        })
      );
    },
  });
};
