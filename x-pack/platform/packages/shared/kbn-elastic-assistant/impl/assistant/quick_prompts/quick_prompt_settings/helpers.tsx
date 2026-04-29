/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';

const euiVisPalette = euiPaletteColorBlind();
export const getRandomEuiColor = () => {
  const randomIndex = Math.floor(Math.random() * euiVisPalette.length);
  return euiVisPalette[randomIndex];
};
