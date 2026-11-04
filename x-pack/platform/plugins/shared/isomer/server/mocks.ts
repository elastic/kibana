/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { IsomerPlugin } from './plugin';
import type { IsomerPluginSetup, IsomerPluginStart } from './plugin';
import type { ScopedMaterializeClient } from './materialize/types';
import { createUnsupportedNode } from './materialize/unsupported';

const createSetupContract = (): jest.Mocked<IsomerPluginSetup> => ({
  registerMaterializer: jest.fn(),
});

/** A scoped client whose `materialize` returns an `unsupported` node until a test says otherwise. */
const createScopedClient = (): jest.Mocked<ScopedMaterializeClient> => ({
  materialize: jest.fn<
    ReturnType<ScopedMaterializeClient['materialize']>,
    Parameters<ScopedMaterializeClient['materialize']>
  >(async () => createUnsupportedNode('Not materialized in this test.')),
  filtersForSelection: jest.fn<
    ReturnType<ScopedMaterializeClient['filtersForSelection']>,
    Parameters<ScopedMaterializeClient['filtersForSelection']>
  >(async () => []),
});

/** A start contract backed by the plugin's shared runtime. */
const createStartContract = (): jest.Mocked<IsomerPluginStart> => {
  const plugin = new IsomerPlugin(coreMock.createPluginInitializerContext({}));
  plugin.setup(coreMock.createSetup());
  const { getRuntime } = plugin.start(coreMock.createStart());
  const scopedClient = createScopedClient();
  return {
    getRuntime: jest.fn(getRuntime),
    isMaterializeEnabled: jest.fn(async () => true),
    asScoped: jest.fn<ScopedMaterializeClient, Parameters<IsomerPluginStart['asScoped']>>(
      () => scopedClient
    ),
  };
};

export const isomerPluginMock = { createSetupContract, createStartContract, createScopedClient };
