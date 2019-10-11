/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chroma from 'chroma-js';

export const getColorsFromPalette = (palette, size) =>
  palette.gradient ? chroma.scale(palette.colors).colors(size) : palette.colors;
