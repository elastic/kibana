/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getInferenceAdapterMock = jest.fn();

jest.doMock('./adapters', () => {
  const actual = jest.requireActual('./adapters');
  return {
    ...actual,
    getInferenceAdapter: getInferenceAdapterMock,
  };
});

export const getInferenceExecutorMock = jest.fn();

jest.doMock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    getInferenceExecutor: getInferenceExecutorMock,
  };
});
