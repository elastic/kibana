/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

vi.mock('../../../app/services/notifications', () => {
  const mocked = {
    getFatalErrors: () => ({
      add: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});
