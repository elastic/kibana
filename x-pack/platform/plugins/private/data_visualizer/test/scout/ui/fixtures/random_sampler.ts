/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RandomSamplerOption =
  | 'dvRandomSamplerOptionOnAutomatic'
  | 'dvRandomSamplerOptionOnManual'
  | 'dvRandomSamplerOptionOff';

export const RANDOM_SAMPLER_OPTION_VALUES: Record<RandomSamplerOption, string> = {
  dvRandomSamplerOptionOff: 'off',
  dvRandomSamplerOptionOnManual: 'on_manual',
  dvRandomSamplerOptionOnAutomatic: 'on_automatic',
};
