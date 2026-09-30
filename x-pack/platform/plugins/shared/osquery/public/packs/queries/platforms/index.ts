/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { uniq } from 'lodash';
import { i18n } from '@kbn/i18n';

export const PLATFORM_IDS = ['linux', 'darwin', 'windows'] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];

export interface OsOption extends EuiComboBoxOptionOption<string> {
  key: PlatformId;
  label: string;
}

const labelFor = (id: PlatformId): string => {
  switch (id) {
    case 'linux':
      return i18n.translate('xpack.osquery.platforms.linuxLabel', {
        defaultMessage: 'Linux',
      });
    case 'darwin':
      return i18n.translate('xpack.osquery.platforms.macOSLabel', {
        defaultMessage: 'macOS',
      });
    case 'windows':
      return i18n.translate('xpack.osquery.platforms.windowsLabel', {
        defaultMessage: 'Windows',
      });
  }
};

export const OS_OPTIONS: OsOption[] = PLATFORM_IDS.map((id) => ({
  key: id,
  label: labelFor(id),
}));

export const OS_LABELS: Record<PlatformId, string> = Object.fromEntries(
  OS_OPTIONS.map((opt) => [opt.key, opt.label])
) as Record<PlatformId, string>;

export const isPlatformId = (value: string): value is PlatformId =>
  (PLATFORM_IDS as readonly string[]).includes(value);

export const getSupportedPlatforms = (payload: string | undefined): string | undefined => {
  let platformArray: string[];
  try {
    platformArray = payload?.split(',').map((platformString) => platformString.trim()) ?? [];
  } catch (e) {
    return undefined;
  }

  if (!platformArray.length) return undefined;

  return uniq(
    platformArray.reduce((acc, nextPlatform) => {
      if (!isPlatformId(nextPlatform)) {
        if (nextPlatform === 'posix') {
          acc.push('darwin');
          acc.push('linux');
        }

        if (nextPlatform === 'ubuntu') {
          acc.push('linux');
        }
      } else {
        acc.push(nextPlatform);
      }

      return acc;
    }, [] as string[])
  ).join(',');
};
