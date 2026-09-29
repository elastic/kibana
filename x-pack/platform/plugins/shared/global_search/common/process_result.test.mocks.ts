/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const convertResultUrlMock = vi.fn().mockReturnValue('converted-url');
vi.doMock('./utils', () => {
      const mocked = {
      convertResultUrl: convertResultUrlMock,
    };
      return { ...mocked, default: mocked };
    });
