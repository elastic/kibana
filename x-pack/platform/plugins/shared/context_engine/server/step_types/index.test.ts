/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { AiIndexService } from '../ai_indices/service';
import { registerStepDefinitions } from '.';

type StepLoader = () => Promise<{ id: string } | undefined>;

const registerAll = (isContextEngineEnabled: () => Promise<boolean>): StepLoader[] => {
  const loaders: StepLoader[] = [];
  const workflowsExtensions = {
    registerStepDefinition: jest.fn((loader: StepLoader) => loaders.push(loader)),
  } as unknown as WorkflowsExtensionsServerPluginSetup;

  registerStepDefinitions({
    workflowsExtensions,
    getAiIndexService: () => ({} as AiIndexService),
    isContextEngineEnabled,
    checkWritePrivilege: async () => true,
  });
  return loaders;
};

describe('registerStepDefinitions', () => {
  it('resolves all step definitions when Context Engine is enabled', async () => {
    const loaders = registerAll(async () => true);

    const definitions = await Promise.all(loaders.map((loader) => loader()));

    expect(definitions.map((definition) => definition?.id)).toEqual([
      'context-engine.createKi',
      'context-engine.updateKi',
      'context-engine.deleteKi',
    ]);
  });

  it('skips registration when Context Engine is disabled', async () => {
    const loaders = registerAll(async () => false);

    const definitions = await Promise.all(loaders.map((loader) => loader()));

    expect(loaders).toHaveLength(3);
    expect(definitions).toEqual([undefined, undefined, undefined]);
  });
});
