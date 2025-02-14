/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { i18n } from '@kbn/i18n';

export type PLATFORM_TYPE =
  | 'linux_aarch64'
  | 'linux_x86_64'
  | 'mac_aarch64'
  | 'mac_x86_64'
  | 'windows'
  | 'rpm_aarch64'
  | 'rpm_x86_64'
  | 'deb_aarch64'
  | 'deb_x86_64'
  | 'kubernetes';

interface PLATFORM_OPTION {
  label: string;
  id: PLATFORM_TYPE;
  'data-test-subj'?: string;
}

export const VISIBLE_PALFORM_OPTIONS: PLATFORM_OPTION[] = [
  {
    id: 'linux_aarch64',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.linux', {
      defaultMessage: 'Linux aarch64',
    }),
    'data-test-subj': 'platformTypeLinux',
  },
  {
    id: 'mac_aarch64',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.mac', {
      defaultMessage: 'MacOS aarch64',
    }),
    'data-test-subj': 'platformTypeMac',
  },
  {
    id: 'deb_aarch64',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.linux.deb', {
      defaultMessage: 'DEB aarch64',
    }),
    'data-test-subj': 'platformTypeLinuxDeb',
  },
  {
    id: 'rpm_aarch64',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.linux.rpm', {
      defaultMessage: 'RPM aarch64',
    }),
    'data-test-subj': 'platformTypeLinuxRpm',
  },
];

export const EXTENDED_PLATFORM_OPTIONS: PLATFORM_OPTION[] = [
  {
    id: 'windows',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.windows', {
      defaultMessage: 'Windows x86_64',
    }),
  },
  {
    id: 'linux_x86_64',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.linux', {
      defaultMessage: 'Linux x86_64',
    }),
  },
  {
    id: 'mac_x86_64',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.mac', {
      defaultMessage: 'MacOS x86_64',
    }),
  },
  {
    id: 'deb_x86_64',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.linux.deb', {
      defaultMessage: 'DEB x86_64',
    }),
  },
  {
    id: 'rpm_x86_64',
    label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.linux.rpm', {
      defaultMessage: 'RPM x86_64',
    }),
  },
];

export const KUBERNETES_PLATFORM_OPTION: PLATFORM_OPTION = {
  id: 'kubernetes',
  label: i18n.translate('xpack.fleet.enrollmentInstructions.platformButtons.kubernetes', {
    defaultMessage: 'Kubernetes',
  }),
  'data-test-subj': 'platformTypeKubernetes',
};

export function usePlatform(initialPlatform: PLATFORM_TYPE = 'linux_aarch64') {
  const [platform, setPlatform] = useState<PLATFORM_TYPE>(initialPlatform);

  return {
    platform,
    setPlatform,
  };
}
