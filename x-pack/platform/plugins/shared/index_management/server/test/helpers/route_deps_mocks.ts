/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from '../../types';
import type { RouterMock } from './router_mock';

/**
 * Override deps.lib.handleEsError for the duration of a test and return a restore function.
 * Keeps types precise without resorting to any.
 */
export function withStubbedHandleEsError(
  deps: Omit<RouteDependencies, 'router'>,
  impl = () => ({ status: 500, options: {} })
): () => void {
  const original = deps.lib.handleEsError;
  // Cast via unknown to preserve signature while returning a minimal IKibanaResponse-like object
  deps.lib.handleEsError = impl as unknown as typeof deps.lib.handleEsError;
  return () => {
    deps.lib.handleEsError = original;
  };
}

/**
 * Get a typed reference to the mockable transport.request function from the RouterMock context.
 */
export function getTransportRequest(
  router: RouterMock
): jest.MockedFunction<
  typeof router.contextMock.core.elasticsearch.client.asCurrentUser.transport.request
> {
  return jest.mocked(router.contextMock.core.elasticsearch.client.asCurrentUser.transport.request);
}
