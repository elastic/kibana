/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
const euiVisPalette = euiPaletteColorBlind();

export const proportion = () => ({ name: 'proportion', color: euiVisPalette[3] });
