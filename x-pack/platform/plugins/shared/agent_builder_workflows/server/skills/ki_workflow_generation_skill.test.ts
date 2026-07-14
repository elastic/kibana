/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { workflowTools } from '../../common/constants';
import { kiWorkflowGenerationSkill } from './ki_workflow_generation_skill';

describe('kiWorkflowGenerationSkill', () => {
  it('registers under the stable ki-workflow-generation id and name at the workflows base path', () => {
    expect(kiWorkflowGenerationSkill.id).toBe('ki-workflow-generation');
    expect(kiWorkflowGenerationSkill.name).toBe('ki-workflow-generation');
    expect(kiWorkflowGenerationSkill.basePath).toBe('skills/platform/workflows');
  });

  it('uses a skill id that is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(kiWorkflowGenerationSkill.id)).toBe(true);
  });

  it('is gated behind the Agent Builder experimental features flag', () => {
    expect(kiWorkflowGenerationSkill.experimental).toBe(true);
  });

  it('ships non-empty markdown content covering the librarian model and maps contract', () => {
    expect(kiWorkflowGenerationSkill.content.length).toBeGreaterThan(0);
    expect(kiWorkflowGenerationSkill.content).toContain('librarian');
    expect(kiWorkflowGenerationSkill.content).toContain('maps');
  });

  it('binds the workflow generation, validation, and execution tools', async () => {
    const toolIds = (await kiWorkflowGenerationSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual(
      expect.arrayContaining([
        platformCoreTools.generateWorkflow,
        platformCoreTools.executeWorkflow,
        platformCoreTools.generateEsql,
        workflowTools.validateWorkflow,
        workflowTools.getStepDefinitions,
        workflowTools.getExamples,
      ])
    );
  });
});
