/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
const { euiColorDarkShade, euiColorWarning } = theme;

export const errorColor = '#c23c2b';
export const neutralColor = euiColorDarkShade;
export const successColor = '#327a42';
export const warningColor = euiColorWarning;

const httpStatusCodeColors: Record<string, string> = {
  1: neutralColor,
  2: successColor,
  3: neutralColor,
  4: warningColor,
  5: errorColor
};

function getStatusColor(status: number) {
  return httpStatusCodeColors[status.toString().substr(0, 1)];
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
