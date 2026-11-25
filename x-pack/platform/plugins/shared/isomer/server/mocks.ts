/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { IsomerPlugin } from './plugin';
import type { IsomerPluginStart } from './plugin';

/** A start contract backed by the plugin's shared runtime. */
const createStartContract = (): jest.Mocked<IsomerPluginStart> => {
  const { getRuntime } = new IsomerPlugin(coreMock.createPluginInitializerContext({})).start();
  return { getRuntime: jest.fn(getRuntime) };
};

export const isomerPluginMock = { createStartContract };
