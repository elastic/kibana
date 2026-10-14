/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

export const TONES = ['neutral', 'success', 'warning', 'risk', 'danger'] as const;

export type Tone = (typeof TONES)[number];

/** A status, never a way to recolor a series: series and scales take their colors from the theme. */
export const toneSchema = () =>
  z
    .enum(TONES)
    .describe(
      'A status: `neutral`, `success`, `warning`, `risk` (worse than warning), or `danger`.'
    );
