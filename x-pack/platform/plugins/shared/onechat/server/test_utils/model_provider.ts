/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/onechat-server';
import type { ModelProviderFactoryFn } from '../services/runner/model_provider';
import { ChangeReturnType } from './common';

export type ModelProviderMock = jest.Mocked<ModelProvider>;
export type ModelProviderFactoryMock = jest.MockedFn<
  ChangeReturnType<ModelProviderFactoryFn, ModelProviderMock>
>;

export const createModelProviderMock = (): ModelProviderMock => {
  return {
    getDefaultModel: jest.fn(),
    getModel: jest.fn(),
  };
};

export const createModelProviderFactoryMock = (): ModelProviderFactoryMock => {
  return jest.fn().mockImplementation(() => createModelProviderMock());
};
