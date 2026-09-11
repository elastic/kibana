/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  SERVICE_ACCOUNT_NAME_MAX_LENGTH,
} from './constants';
import { serviceAccountIdSchema, serviceAccountNameSchema } from './schemas';

describe('service account schemas', () => {
  it.each([
    [serviceAccountIdSchema, SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH],
    [serviceAccountNameSchema, SERVICE_ACCOUNT_NAME_MAX_LENGTH],
  ] as const)('enforces the string length boundary', (schema, maxLength) => {
    expect(schema.safeParse('a'.repeat(maxLength)).success).toBe(true);
    expect(schema.safeParse('a'.repeat(maxLength + 1)).success).toBe(false);
    expect(schema.safeParse(123).success).toBe(false);
  });
});
