/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiKeyInvalidationTaskConfigSchema } from './config_schema';

describe('apiKeyInvalidationTaskConfigSchema', () => {
  test('has defaults', () => {
    expect(apiKeyInvalidationTaskConfigSchema.validate({})).toEqual({
      interval: '5m',
      removalDelay: '1h',
    });
  });

  test.each(['30s', '5m', '1h', '2d'])('accepts %s', (interval) => {
    expect(apiKeyInvalidationTaskConfigSchema.validate({ interval }).interval).toBe(interval);
  });

  test.each(['500ms', '1w', '0m', 'abc'])('rejects %s, which the task cannot parse', (interval) => {
    expect(() => apiKeyInvalidationTaskConfigSchema.validate({ interval })).toThrow(
      `string is not a valid duration: ${interval}`
    );
  });
});
