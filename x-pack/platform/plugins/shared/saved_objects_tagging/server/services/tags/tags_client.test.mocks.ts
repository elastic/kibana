/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const validateTagMock = vi.fn();

vi.doMock('./validate_tag', () => {
  const mocked = {
    validateTag: validateTagMock,
  };
  return { ...mocked, default: mocked };
});
