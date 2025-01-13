/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MethodKeysOf } from '@kbn/utility-types';
import { RequestHandlerContext, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { identity } from 'lodash';
import { httpServerMock } from '@kbn/core/server/mocks';

export function mockHandlerArguments(
  {}: {},
  req: unknown,
  res?: Array<MethodKeysOf<KibanaResponseFactory>>
): [RequestHandlerContext, KibanaRequest<unknown, unknown, unknown>, KibanaResponseFactory] {
  return [
    {} as unknown as RequestHandlerContext,
    req as KibanaRequest<unknown, unknown, unknown>,
    mockResponseFactory(res),
  ];
}

export const mockResponseFactory = (resToMock: Array<MethodKeysOf<KibanaResponseFactory>> = []) => {
  const factory: jest.Mocked<KibanaResponseFactory> = httpServerMock.createResponseFactory();
  resToMock.forEach((key: string) => {
    if (key in factory) {
      Object.defineProperty(factory, key, {
        value: jest.fn(identity),
      });
    }
  });
  return factory as unknown as KibanaResponseFactory;
};
