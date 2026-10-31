/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';

import { sendUpdatePackage } from '../../../../hooks';

/**
 * Applies the columnar index mode picked on the add or edit integration page through the update
 * package API, once the policy is saved. Nothing to do when the switch wasn't used; the API
 * ignores a choice that is already stored.
 */
export async function applyLogsdbColumnarChange(
  pkgName: string,
  pkgVersion: string,
  enabled: boolean | undefined,
  notifications: NotificationsStart,
  packageTitle: string
): Promise<void> {
  if (enabled === undefined) {
    return;
  }

  const { error } = await sendUpdatePackage(pkgName, pkgVersion, { logsdb_columnar: enabled });

  if (error) {
    notifications.toasts.addError(error, {
      title: i18n.translate('xpack.fleet.packagePolicy.logsdbColumnarApplyErrorTitle', {
        defaultMessage: 'Could not change the columnar index mode of {title}',
        values: { title: packageTitle },
      }),
    });
  }
}
