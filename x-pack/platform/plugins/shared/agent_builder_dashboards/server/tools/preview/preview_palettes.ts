/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKbnPalettes, type KbnPalettes } from '@kbn/palettes';

let previewPalettes: KbnPalettes | undefined;

/**
 * Kibana's palettes for the light Borealis theme, the ones Lens colors charts with, e.g.
 * `getPreviewPalettes().get('default').colors(30)`. Built on first use.
 */
export const getPreviewPalettes = (): KbnPalettes => {
  previewPalettes ??= getKbnPalettes({ name: 'borealis', darkMode: false });
  return previewPalettes;
};
