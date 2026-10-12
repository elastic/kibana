/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderStylesOptions } from '@elastic/distillate';
import { createDistillery } from '@elastic/distillate';
import { borealisDarkVariation, borealisTheme } from './borealis_theme';

/** Class of the `section` every Isomer surface wraps rendered content in. */
export const ISOMER_ROOT_CLASS = 'isomer';

const DARK_VARIATION = 'dark';

/** The single Distillate instance Kibana's Isomer primitive packs author their styles against. */
export const isomerDistillery = createDistillery({
  dev: process.env.NODE_ENV !== 'production',
  prefix: 'isomer',
  themeScope: `.${ISOMER_ROOT_CLASS}`,
  theme: borealisTheme,
  variations: { [DARK_VARIATION]: borealisDarkVariation },
});

/** `renderStyles` options for one Isomer render: browsers switch on `data-theme`; a fixed `scheme` emits literals. */
export const isomerRenderOptions = (scheme?: 'light' | 'dark'): RenderStylesOptions => {
  if (!scheme) {
    return { alternates: [{ variation: DARK_VARIATION, selector: "[data-theme='dark']" }] };
  }
  return scheme === 'dark' ? { scheme, flatten: DARK_VARIATION } : { scheme };
};
