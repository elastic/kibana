/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chroma from 'chroma-js';

export function readableColor(background: string, light: string = '#FFF', dark: string = '#333') {
  try {
    return chroma.contrast(background, '#000') < 7 ? light : dark;
  } catch (e) {
    return dark;
  }
}
