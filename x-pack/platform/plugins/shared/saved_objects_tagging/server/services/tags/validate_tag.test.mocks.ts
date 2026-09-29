/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const validateTagNameMock = vi.fn();
export const validateTagColorMock = vi.fn();
export const validateTagDescriptionMock = vi.fn();

vi.doMock('../../../common/validation', () => {
  const mocked = {
    validateTagName: validateTagNameMock,
    validateTagColor: validateTagColorMock,
    validateTagDescription: validateTagDescriptionMock,
  };
  return { ...mocked, default: mocked };
});
