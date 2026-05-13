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
 * After saving a package policy, sync the package's `namespace_customization_enabled_for` list
 * so that the policy's namespace is added (when the toggle is on) or removed (when it is off
 * and no other opted-in reason exists).
 *
 * Best effort: on error a toast is shown but no exception is rethrown — the policy save itself
 * has already succeeded.
 */
export async function applyNamespaceCustomizationChange(
  pkgName: string,
  pkgVersion: string,
  namespace: string | undefined,
  desiredEnabled: boolean,
  installedEnabledFor: string[],
  notifications: NotificationsStart,
  packageTitle: string
): Promise<void> {
  const trimmed = namespace?.trim();
  if (!trimmed) {
    return;
  }
  const isCurrentlyEnabled = installedEnabledFor.includes(trimmed);

  let nextEnabledFor: string[] | undefined;
  if (desiredEnabled && !isCurrentlyEnabled) {
    nextEnabledFor = [...installedEnabledFor, trimmed];
  } else if (!desiredEnabled && isCurrentlyEnabled) {
    nextEnabledFor = installedEnabledFor.filter((ns) => ns !== trimmed);
  }

  if (nextEnabledFor === undefined) {
    return;
  }

  const { error } = await sendUpdatePackage(pkgName, pkgVersion, {
    namespace_customization_enabled_for: nextEnabledFor,
  });

  if (error) {
    notifications.toasts.addError(error, {
      title: i18n.translate('xpack.fleet.packagePolicy.namespaceCustomizationApplyErrorTitle', {
        defaultMessage: 'Could not update namespace customization for {title}',
        values: { title: packageTitle },
      }),
    });
    return;
  }

  notifications.toasts.addSuccess({
    title: i18n.translate('xpack.fleet.packagePolicy.namespaceCustomizationApplySuccessTitle', {
      defaultMessage: 'Namespace customization updated',
    }),
    text: i18n.translate('xpack.fleet.packagePolicy.namespaceCustomizationApplySuccessText', {
      defaultMessage: 'Applying namespace customization changes for {title}.',
      values: { title: packageTitle },
    }),
  });
}
