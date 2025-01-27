/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isNativeFunctionCallingSupportedMock = jest.fn();

jest.doMock('../../utils/function_calling_support', () => {
  const actual = jest.requireActual('../../utils/function_calling_support');
  return {
    ...actual,
    isNativeFunctionCallingSupported: isNativeFunctionCallingSupportedMock,
  };
});
