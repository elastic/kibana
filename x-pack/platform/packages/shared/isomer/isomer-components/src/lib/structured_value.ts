/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { displayValueSchema } from '@elastic/isomer-sdk';

// The SDK exports the display value union (`string | StructuredValue`) but no longer its
// structured half, so take that half from the union.
export const structuredValueSchema = displayValueSchema.options[1];

export const STRUCTURED_VALUE_FORMATS = structuredValueSchema.shape.format.unwrap().options;
