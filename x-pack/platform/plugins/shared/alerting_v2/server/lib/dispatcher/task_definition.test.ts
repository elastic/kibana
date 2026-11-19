/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from '../../config';
import { createConfigServiceMock } from '../services/config_service/config_service.mock';
import { DispatcherTaskDefinition } from './task_definition';

describe('DispatcherTaskDefinition', () => {
  describe('resolveTimeout', () => {
    test('returns the configured dispatcher timeout', () => {
      const config = configSchema.validate({ dispatcher: { run: { timeout: '3m' } } });
      expect(DispatcherTaskDefinition.resolveTimeout?.(createConfigServiceMock(config))).toBe('3m');
    });
  });
});
