/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requiredString, z } from '@elastic/isomer-sdk';

/** Plain text of any length, which each surface fits. Blank text is allowed: its primitive leaves it out. */
export const plainText = () => z.string();

/** A plain-text label of any length, with at least one character that isn't whitespace. */
export const plainLabel = () =>
  requiredString().refine((value) => value === '' || /\S/.test(value), {
    error: 'must not be blank',
  });

/** Whether `value` has a character that isn't whitespace. */
export const hasText = (value: string): boolean => /\S/.test(value);

/** `value` with runs of whitespace, newlines included, collapsed to one space. */
export const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim();
