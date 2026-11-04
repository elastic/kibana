/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

/**
 * Limits for surface compositions. Text of any length is fine, since each surface fits it, but a
 * `fields` node takes at most `fieldItems` items, and a table shows `tableRows` rows before it
 * counts the rest.
 */
export const SURFACE_LIMITS = {
  fieldItems: SLACK_LIMITS.fieldsPerSection,
  tableRows: 50,
} as const;

/** Whether `value` has something other than whitespace, which plain-text primitives require. */
export const hasText = (value: string | undefined): value is string =>
  value !== undefined && /\S/.test(value);
