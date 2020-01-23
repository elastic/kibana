/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { TagFactory } from '../../../public/lib/tag';
import { TagStrings as strings } from '../../../i18n';
const euiVisPalette = euiPaletteColorBlind();

export const graphic: TagFactory = () => ({
  name: strings.graphic(),
  color: euiVisPalette[5],
});
