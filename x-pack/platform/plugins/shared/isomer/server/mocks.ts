/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { createFieldFormatsStartMock } from '@kbn/field-formats-plugin/server/mocks';
import { metricExamples } from '@kbn/isomer';
import { IsomerPlugin } from './plugin';
import type { IsomerPluginSetup, IsomerPluginStart } from './plugin';
import type { ScopedMaterializeClient } from './materialize/types';

const createSetupContract = (): jest.Mocked<IsomerPluginSetup> => ({
  registerMaterializer: jest.fn(),
});

/** A scoped client whose `materialize` returns the charts pack's first metric example until a test says otherwise. */
const createScopedClient = (): jest.Mocked<ScopedMaterializeClient> => ({
  materialize: jest.fn<
    ReturnType<ScopedMaterializeClient['materialize']>,
    Parameters<ScopedMaterializeClient['materialize']>
  >(async () => metricExamples[0].node),
  filtersForSelection: jest.fn<
    ReturnType<ScopedMaterializeClient['filtersForSelection']>,
    Parameters<ScopedMaterializeClient['filtersForSelection']>
  >(async () => []),
});

/** A start contract backed by the plugin's shared runtime. */
const createStartContract = (): jest.Mocked<IsomerPluginStart> => {
  const plugin = new IsomerPlugin(coreMock.createPluginInitializerContext({}));
  plugin.setup(coreMock.createSetup());
  const { getRuntime } = plugin.start(coreMock.createStart(), {
    data: dataPluginMock.createStartContract(),
    fieldFormats: createFieldFormatsStartMock(),
  });
  const scopedClient = createScopedClient();
  return {
    getRuntime: jest.fn(getRuntime),
    isMaterializeEnabled: jest.fn(async () => true),
    asScoped: jest.fn<ScopedMaterializeClient, Parameters<IsomerPluginStart['asScoped']>>(
      () => scopedClient
    ),
    renderPng: jest.fn(),
  };
};

export const isomerPluginMock = { createSetupContract, createStartContract, createScopedClient };
