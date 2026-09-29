/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const fetchServerResultsMock = vi.fn();
vi.doMock('./fetch_server_results', () => {
  const mocked = {
    fetchServerResults: fetchServerResultsMock,
  };
  return { ...mocked, default: mocked };
});

export const fetchServerSearchableTypesMock = vi.fn();
vi.doMock('./fetch_server_searchable_types', () => {
  const mocked = {
    fetchServerSearchableTypes: fetchServerSearchableTypesMock,
  };
  return { ...mocked, default: mocked };
});

export const getDefaultPreferenceMock = vi.fn();
vi.doMock('./utils', async () => {
  const original = await vi.importActual('./utils');

  return {
    ...original,
    getDefaultPreference: getDefaultPreferenceMock,
  };
});
