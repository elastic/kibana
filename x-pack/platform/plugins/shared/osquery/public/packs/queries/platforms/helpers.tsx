/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { uniq } from 'lodash';
import { SUPPORTED_PLATFORMS } from './constants';

import { LinuxIcon } from './logos/linux';
import { MacOsIcon } from './logos/macos';
import { WindowsIcon } from './logos/windows';
import { PlatformType } from './types';

export const getPlatformIconModule = (platform: string): IconType => {
  switch (platform) {
    case 'darwin':
      return MacOsIcon;
    case 'linux':
      return LinuxIcon;
    case 'windows':
      return WindowsIcon;
    default:
      return 'empty';
  }
};

export const getSupportedPlatforms = (payload: string) => {
  let platformArray: string[];
  try {
    platformArray = payload?.split(',').map((platformString) => platformString.trim());
  } catch (e) {
    return undefined;
  }

  if (!platformArray) return;

  return uniq(
    platformArray.reduce((acc, nextPlatform) => {
      if (!SUPPORTED_PLATFORMS.includes(nextPlatform as PlatformType)) {
        if (nextPlatform === 'posix') {
          acc.push(PlatformType.darwin);
          acc.push(PlatformType.linux);
        }

        if (nextPlatform === 'ubuntu') {
          acc.push(PlatformType.linux);
        }
      } else {
        acc.push(nextPlatform);
      }

      return acc;
    }, [] as string[])
  ).join(',');
};
