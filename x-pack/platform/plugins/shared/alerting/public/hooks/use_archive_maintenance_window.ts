/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';

import { useKibana } from '../utils/kibana_react';
import { archiveMaintenanceWindow } from '../services/maintenance_windows_api/archive';

export function useArchiveMaintenanceWindow() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = ({
    maintenanceWindowId,
    archive,
  }: {
    maintenanceWindowId: string;
    archive: boolean;
  }) => {
    return archiveMaintenanceWindow({ http, maintenanceWindowId, archive });
  };

  return useMutation(mutationFn, {
    onSuccess: (data, { archive }) => {
      const archiveToast = i18n.translate('xpack.alerting.maintenanceWindowsArchiveSuccess', {
        defaultMessage: "Archived maintenance window ''{title}''",
        values: {
          title: data.title,
        },
      });
      const unarchiveToast = i18n.translate('xpack.alerting.maintenanceWindowsUnarchiveSuccess', {
        defaultMessage: "Unarchived maintenance window ''{title}''",
        values: {
          title: data.title,
        },
      });
      toasts.addSuccess(archive ? archiveToast : unarchiveToast);
    },
    onError: (error, { archive }) => {
      const archiveToast = i18n.translate('xpack.alerting.maintenanceWindowsArchiveFailure', {
        defaultMessage: 'Failed to archive maintenance window.',
      });
      const unarchiveToast = i18n.translate('xpack.alerting.maintenanceWindowsUnarchiveFailure', {
        defaultMessage: 'Failed to unarchive maintenance window.',
      });
      toasts.addDanger(archive ? archiveToast : unarchiveToast);
    },
  });
}
