/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuntime } from './create_runtime';
import type { IsomerPluginStart } from './plugin';

/** A start contract whose `getRuntime` resolves a real runtime with the plugin's packs. */
const createStartContract = (): jest.Mocked<IsomerPluginStart> => ({
  getRuntime: jest.fn(createRuntime),
});

export const isomerPluginMock = { createStartContract };
