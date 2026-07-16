/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { kiWorkflowGenerationSkill } from './ki_workflow_generation_skill';

describe('kiWorkflowGenerationSkill', () => {
  it('registers with stable id, name, and context-engine base path', () => {
    expect(kiWorkflowGenerationSkill.id).toBe('ki-workflow-generation');
    expect(kiWorkflowGenerationSkill.name).toBe('ki-workflow-generation');
    expect(kiWorkflowGenerationSkill.basePath).toBe('skills/platform/context-engine');
  });

  it('is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(kiWorkflowGenerationSkill.id)).toBe(true);
  });

  it('is gated behind experimental features', () => {
    expect(kiWorkflowGenerationSkill.experimental).toBe(true);
  });

  it('ships non-empty markdown content', () => {
    expect(typeof kiWorkflowGenerationSkill.content).toBe('string');
    expect(kiWorkflowGenerationSkill.content.length).toBeGreaterThan(0);
  });

  it('has exactly one referencedContent entry for the index-selection reference workflow', () => {
    expect(kiWorkflowGenerationSkill.referencedContent).toHaveLength(1);
    const ref = kiWorkflowGenerationSkill.referencedContent![0];
    expect(ref.name).toBe('index-selection-reference-workflow');
    expect(ref.relativePath).toBe('.');
    expect(ref.content.length).toBeGreaterThan(0);
  });

  it('binds all required registry tools including getConnectors', async () => {
    const toolIds = (await kiWorkflowGenerationSkill.getRegistryTools?.()) ?? [];

    const expectedTools = [
      platformCoreTools.generateWorkflow,
      platformCoreTools.executeWorkflow,
      platformCoreTools.generateEsql,
      `${internalNamespaces.workflows}.validate_workflow`,
      `${internalNamespaces.workflows}.get_step_definitions`,
      `${internalNamespaces.workflows}.get_examples`,
      `${internalNamespaces.workflows}.get_connectors`,
    ];

    for (const tool of expectedTools) {
      expect(toolIds).toContain(tool);
    }
  });
});
