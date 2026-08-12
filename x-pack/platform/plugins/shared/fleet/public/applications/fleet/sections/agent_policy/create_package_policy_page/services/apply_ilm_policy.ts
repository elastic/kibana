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

  // No-op check: avoid an API round trip if the stale local copy already matches.
  const existingSettings =
    'installationInfo' in packageInfo
      ? packageInfo.installationInfo?.namespace_customization_settings ?? {}
      : {};
  const existingIlmPolicy = existingSettings[trimmed]?.ilm_policy;
  if (existingIlmPolicy === ilmPolicy) {
    return;
  }

  // Send only the changed namespace. The server merges per-namespace so other namespaces'
  // settings are preserved even if the local packageInfo is stale (concurrent-update safety).
  // An empty object signals "clear all managed settings for this namespace".
  const nsSettings: { ilm_policy?: string } = ilmPolicy ? { ilm_policy: ilmPolicy } : {};

  const { error } = await sendUpdatePackage(pkgName, pkgVersion, {
    namespace_customization_settings: { [trimmed]: nsSettings },
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
