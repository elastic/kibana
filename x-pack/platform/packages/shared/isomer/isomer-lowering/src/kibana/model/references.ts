/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tone } from './tone';

// Reference lines and annotation bands carried alongside a chart shape.

export interface Reference {
  value: number;
  tone?: Tone;
  label?: string;
}
