/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { StringMap } from '../../typings/common';

const {
  euiColorDarkShade,
  euiColorSecondary,
  euiColorWarning,
  euiColorDanger
} = theme;

export const httpsStatusCodeColors: StringMap<string> = {
  1: euiColorDarkShade,
  2: euiColorSecondary,
  3: euiColorDarkShade,
  4: euiColorWarning,
  5: euiColorDanger
};

function getStatusColor(status: number) {
  return httpsStatusCodeColors[status.toString().substr(0, 1)];
}

/**
 * Convert an HTTP status code to a color.
 *
 * If passed a string, it will remove all non-numeric characters
 */
export function httpStatusCodeToColor(status: string | number) {
  if (typeof status === 'string') {
    return getStatusColor(parseInt(status.replace(/\D/g, ''), 10));
  } else {
    return getStatusColor(status);
  }
}
