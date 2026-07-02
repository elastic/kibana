/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';

import type { PackageInfo } from '../../../../types';
import { sendUpdatePackage } from '../../../../hooks';

export async function applyIlmPolicyChange(
  pkgName: string,
  pkgVersion: string,
  namespace: string | undefined,
  ilmPolicy: string | undefined,
  packageInfo: PackageInfo,
  notifications: NotificationsStart,
  packageTitle: string
): Promise<void> {
  const trimmed = namespace?.trim();
  if (!trimmed) {
    return;
  }

  const existingSettings =
    'installationInfo' in packageInfo
      ? packageInfo.installationInfo?.namespace_customization_settings ?? {}
      : {};

  const existingIlmPolicy = existingSettings[trimmed]?.ilm_policy;
  if (existingIlmPolicy === ilmPolicy) {
    return;
  }

  // Build next settings: update (or remove) only the current namespace's ilm_policy
  const nextSettings: typeof existingSettings = { ...existingSettings };
  if (ilmPolicy) {
    nextSettings[trimmed] = { ...existingSettings[trimmed], ilm_policy: ilmPolicy };
  } else {
    const { ilm_policy: _removed, ...rest } = existingSettings[trimmed] ?? {};
    if (Object.keys(rest).length > 0) {
      nextSettings[trimmed] = rest;
    } else {
      delete nextSettings[trimmed];
    }
  }

  const { error } = await sendUpdatePackage(pkgName, pkgVersion, {
    namespace_customization_settings: nextSettings,
  });

  if (error) {
    notifications.toasts.addError(error, {
      title: i18n.translate('xpack.fleet.packagePolicy.ilmPolicyApplyErrorTitle', {
        defaultMessage: 'Could not update ILM policy for {title}',
        values: { title: packageTitle },
      }),
    });
    return;
  }

  notifications.toasts.addSuccess({
    title: i18n.translate('xpack.fleet.packagePolicy.ilmPolicyApplySuccessTitle', {
      defaultMessage: 'ILM policy updated',
    }),
    text: i18n.translate('xpack.fleet.packagePolicy.ilmPolicyApplySuccessText', {
      defaultMessage: 'Applying ILM policy changes for {title}.',
      values: { title: packageTitle },
    }),
  });
}
