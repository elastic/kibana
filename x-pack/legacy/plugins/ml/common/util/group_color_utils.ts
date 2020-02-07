/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiVars from '@elastic/eui/dist/eui_theme_dark.json';

const COLORS = [
  euiVars.euiColorVis0,
  euiVars.euiColorVis1,
  euiVars.euiColorVis2,
  euiVars.euiColorVis3,
  // euiVars.euiColorVis4, // light pink, too hard to read with white text
  euiVars.euiColorVis5,
  euiVars.euiColorVis6,
  euiVars.euiColorVis7,
  euiVars.euiColorVis8,
  euiVars.euiColorVis9,
  euiVars.euiColorDarkShade,
  euiVars.euiColorPrimary,
];

const colorMap: Record<string, string> = {};

export function tabColor(name: string): string {
  if (colorMap[name] === undefined) {
    const n = stringHash(name);
    const color = COLORS[n % COLORS.length];
    colorMap[name] = color;
    return color;
  } else {
    return colorMap[name];
  }
}

function stringHash(str: string): number {
  let hash = 0;
  let chr = 0;
  if (str.length === 0) {
    return hash;
  }
  for (let i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr; // eslint-disable-line no-bitwise
    hash |= 0; // eslint-disable-line no-bitwise
  }
  return hash < 0 ? hash * -2 : hash;
}
