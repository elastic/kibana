/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDistillery } from '@elastic/distillate';
import { borealisTheme } from './borealis_theme';

/** Class of the `section` every Isomer surface wraps rendered content in. */
export const ISOMER_ROOT_CLASS = 'isomer';

/** The single Distillate instance Kibana's Isomer primitive packs author their styles against. */
export const isomerDistillery = createDistillery({
  dev: process.env.NODE_ENV !== 'production',
  prefix: 'isomer',
  themeScope: `.${ISOMER_ROOT_CLASS}`,
  theme: borealisTheme,
});
