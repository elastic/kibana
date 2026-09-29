/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const getInferenceAdapterMock = vi.fn();

vi.doMock('./adapters', async () => {
  const actual = await vi.importActual('./adapters');
  return {
    ...actual,
    getInferenceAdapter: getInferenceAdapterMock,
  };
});

export const inferenceEndpointAdapterMock = {
  chatComplete: vi.fn(),
};

vi.doMock('./adapters/inference_endpoint', () => {
  const mocked = {
    inferenceEndpointAdapter: inferenceEndpointAdapterMock,
  };
  return { ...mocked, default: mocked };
});

export const getInferenceExecutorMock = vi.fn();
export const resolveInferenceEndpointMock = vi.fn();
export const createInferenceEndpointExecutorMock = vi.fn();

vi.doMock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    getInferenceExecutor: getInferenceExecutorMock,
    resolveInferenceEndpoint: resolveInferenceEndpointMock,
    createInferenceEndpointExecutor: createInferenceEndpointExecutorMock,
  };
});
