/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { zipSchemes } from '@elastic/distillate';
import { borealisDark, borealisLight } from './borealis_tokens.generated';

/** Borealis tokens for both color modes; values that differ by mode become `light-dark()` pairs. */
export const borealisTheme = zipSchemes(borealisLight, borealisDark);
