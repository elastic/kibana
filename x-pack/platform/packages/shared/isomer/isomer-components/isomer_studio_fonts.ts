/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Studio may load this as ES or CommonJS, depending on how it imports its config.
const here = typeof __dirname === 'string' ? __dirname : dirname(fileURLToPath(import.meta.url));

// Kibana's own copies of the faces Borealis names, so Studio PNGs draw in the fonts the web does.
const FONTS = resolve(
  here,
  '../../../../../../src/core/packages/apps/server-internal/assets/fonts'
);

const face = (
  file: string,
  name: string,
  weight: number,
  generic?: 'sans-serif' | 'monospace'
) => ({
  name,
  weight,
  ...(generic ? { generic } : {}),
  data: () => readFile(resolve(FONTS, file)),
});

// The `imageFonts` module of `isomer_studio.config.ts`; only Studio's Node side imports it.
export default [
  face('inter/Inter-Regular.woff2', 'Inter', 400, 'sans-serif'),
  face('inter/Inter-Medium.woff2', 'Inter', 500),
  face('inter/Inter-SemiBold.woff2', 'Inter', 600),
  face('inter/Inter-Bold.woff2', 'Inter', 700),
  face('roboto_mono/RobotoMono-Regular.ttf', 'Roboto Mono', 400, 'monospace'),
];
