/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fetchServerResultsMock = jest.fn();
jest.doMock('./fetch_server_results', () => ({
  fetchServerResults: fetchServerResultsMock,
}));

export const fetchServerSearchableTypesMock = jest.fn();
jest.doMock('./fetch_server_searchable_types', () => ({
  fetchServerSearchableTypes: fetchServerSearchableTypesMock,
}));

export const getDefaultPreferenceMock = jest.fn();
jest.doMock('./utils', () => {
  const original = jest.requireActual('./utils');

  return {
    ...original,
    getDefaultPreference: getDefaultPreferenceMock,
  };
});
