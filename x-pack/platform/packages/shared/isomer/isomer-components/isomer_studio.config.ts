/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKibanaIsomerRuntime } from '@kbn/isomer';
import { createIsomerStyleContext } from '@kbn/isomer-theme';

import { componentsPack } from './src/pack';

// Not `defineStudioConfig`: the Studio runs through `npx`, so `@elastic/isomer-studio` is not installed to import.
export default {
  title: '@kbn/isomer-components',
  runtime: createKibanaIsomerRuntime({ packs: [componentsPack] }),
  createReactContext: (root: ShadowRoot) => createIsomerStyleContext({ root }),
  imageFonts: './isomer_studio_fonts.ts',
};
