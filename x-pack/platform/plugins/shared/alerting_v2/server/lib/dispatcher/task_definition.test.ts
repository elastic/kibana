/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from '../../config';
import { DispatcherTaskDefinition } from './task_definition';

describe('DispatcherTaskDefinition', () => {
  describe('resolveTimeout', () => {
    test('returns the configured dispatcher timeout', () => {
      const config = configSchema.validate({ dispatcher: { run: { timeout: '3m' } } });
      expect(DispatcherTaskDefinition.resolveTimeout?.(config)).toBe('3m');
    });

    test('returns the 1m default when the dispatcher timeout is not configured', () => {
      expect(DispatcherTaskDefinition.resolveTimeout?.(configSchema.validate({}))).toBe('1m');
    });
  });
});
