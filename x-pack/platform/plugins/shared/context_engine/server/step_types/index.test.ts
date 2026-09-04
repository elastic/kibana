/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { AiIndexService } from '../ai_indices/service';
import { registerStepDefinitions } from '.';
import { mockKiStepTelemetry } from './test_utils';

describe('registerStepDefinitions', () => {
  it('registers the three KI step definitions', () => {
    const definitions: Array<{ id: string }> = [];
    const workflowsExtensions = {
      registerStepDefinition: jest.fn((definition: { id: string }) => definitions.push(definition)),
    } as unknown as WorkflowsExtensionsServerPluginSetup;

    registerStepDefinitions({
      workflowsExtensions,
      getAiIndexService: () => ({} as AiIndexService),
      isContextEngineEnabled: async () => true,
      checkWritePrivilege: async () => true,
      ...mockKiStepTelemetry(),
    });

    expect(definitions.map((definition) => definition.id)).toEqual([
      'context-engine.createKi',
      'context-engine.updateKi',
      'context-engine.deleteKi',
    ]);
  });
});
