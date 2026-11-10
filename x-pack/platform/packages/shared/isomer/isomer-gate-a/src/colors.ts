/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chroma from 'chroma-js';

/**
 * A CSS color as lowercase hex (`#rrggbb`, or `#rrggbbaa` when it isn't opaque), so colors from
 * the DOM (`rgb()`), Elastic Charts and Isomer compare as strings. Anything that isn't a color is
 * kept as is, so it shows up in a difference rather than being hidden.
 */
export const normalizeColor = (color: string): string => {
  if (!chroma.valid(color)) {
    return color;
  }
  const parsed = chroma(color);
  return parsed.alpha() < 1 ? parsed.hex('rgba') : parsed.hex('rgb');
};
