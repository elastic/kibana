/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { AiIndexService } from '../ai_indices/service';
import type { ImprovementsServiceApi } from '../improvements/service';
import { registerStepDefinitions } from '.';
import { mockKiStepTelemetry } from './test_utils';

describe('registerStepDefinitions', () => {
  it('registers the KI and feedback analysis step definitions', () => {
    const definitions: Array<{ id: string }> = [];
    const workflowsExtensions = {
      registerStepDefinition: jest.fn((definition: { id: string }) => definitions.push(definition)),
    } as unknown as WorkflowsExtensionsServerPluginSetup;
    const telemetry = mockKiStepTelemetry();

    registerStepDefinitions({
      workflowsExtensions,
      getAiIndexService: () => ({} as AiIndexService),
      isContextEngineEnabled: async () => true,
      checkWritePrivilege: async () => true,
      ...telemetry,
      feedbackAnalysis: {
        getAiIndexService: () => ({} as AiIndexService),
        getImprovementsService: () => ({} as ImprovementsServiceApi),
        getAuditLogger: async () => undefined,
        isContextEngineEnabled: async () => true,
        isFeedbackLoopEnabled: async () => true,
        checkWritePrivilege: async () => true,
        logger: telemetry.logger,
      },
    });

    expect(definitions.map((definition) => definition.id)).toEqual([
      'context-engine.createKi',
      'context-engine.updateKi',
      'context-engine.deleteKi',
      'context-engine.getFeedbackContext',
      'context-engine.recordImprovements',
    ]);
  });
});
