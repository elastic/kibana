/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { coreMock } from '../src/core/server/mocks';
import { licensingMock } from './plugins/licensing/server/mocks';

function createCoreRequestHandlerContextMock() {
  return {
    core: coreMock.createRequestHandlerContext(),
    licensing: licensingMock.createRequestHandlerContext(),
  };
}

export const xpackMocks = {
  createRequestHandlerContext: createCoreRequestHandlerContextMock,
};
