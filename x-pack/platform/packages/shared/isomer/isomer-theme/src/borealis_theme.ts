/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { zipSchemes } from '@elastic/distillate';
import { borealisDark, borealisLight } from './borealis_tokens.generated';

const { shadow: lightShadow, ...lightZippable } = borealisLight;
const { shadow: darkShadow, ...darkZippable } = borealisDark;

/** Borealis tokens for both color modes; colors that differ by mode become `light-dark()` pairs, and shadows default to light. */
export const borealisTheme = { ...zipSchemes(lightZippable, darkZippable), shadow: lightShadow };

/** Dark-mode values that `light-dark()` can't carry because they aren't colors. */
export const borealisDarkVariation = { shadow: darkShadow };
