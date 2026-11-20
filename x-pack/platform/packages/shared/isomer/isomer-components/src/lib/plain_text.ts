/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requiredString } from '@elastic/isomer-sdk';

/** A plain-text field of at most `max` characters, at least one of them not whitespace. */
export const plainText = (max: number) =>
  requiredString()
    .max(max)
    .refine((value) => value === '' || /\S/.test(value), { error: 'must not be blank' });

/** `value` with runs of whitespace, newlines included, collapsed to one space. */
export const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim();
