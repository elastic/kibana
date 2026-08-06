/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { kiAutomationGenerationSkill } from './ki_automation_generation_skill';

describe('kiAutomationGenerationSkill', () => {
  it('registers with stable id, name, and context-engine base path', () => {
    expect(kiAutomationGenerationSkill.id).toBe('ki-automation-generation');
    expect(kiAutomationGenerationSkill.name).toBe('ki-automation-generation');
    expect(kiAutomationGenerationSkill.basePath).toBe('skills/platform/context-engine');
  });

  it('is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(kiAutomationGenerationSkill.id)).toBe(true);
  });

  it('is gated behind experimental features', () => {
    expect(kiAutomationGenerationSkill.experimental).toBe(true);
  });

  it('ships non-empty markdown content', () => {
    expect(typeof kiAutomationGenerationSkill.content).toBe('string');
    expect(kiAutomationGenerationSkill.content.length).toBeGreaterThan(0);
  });

  it('has exactly one referencedContent entry for the index-selection reference workflow', () => {
    expect(kiAutomationGenerationSkill.referencedContent).toHaveLength(1);
    const ref = kiAutomationGenerationSkill.referencedContent![0];
    expect(ref.name).toBe('index-selection-reference-workflow');
    expect(ref.relativePath).toBe('.');
    expect(ref.content.length).toBeGreaterThan(0);
  });

  it('binds all required registry tools including getConnectors', async () => {
    const toolIds = (await kiAutomationGenerationSkill.getRegistryTools?.()) ?? [];

    const expectedTools = [
      platformCoreTools.generateWorkflow,
      platformCoreTools.executeWorkflow,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
      platformCoreTools.listIndices,
      platformCoreTools.getIndexMapping,
      platformCoreTools.getWorkflowExecutionStatus,
      `${internalNamespaces.workflows}.validate_workflow`,
      `${internalNamespaces.workflows}.get_step_definitions`,
      `${internalNamespaces.workflows}.get_examples`,
      `${internalNamespaces.workflows}.get_connectors`,
    ];

    expect(toolIds).toEqual(expectedTools);
  });

  it('only instructs the agent to call tools that are actually bound', async () => {
    const boundTools = (await kiAutomationGenerationSkill.getRegistryTools?.()) ?? [];

    // Every `platform.core.*` / `platform.workflows.*` tool id the content tells the
    // agent to call must be bound — guards against prose drifting from the bindings.
    const referencedToolIds = [
      ...new Set(
        [
          ...kiAutomationGenerationSkill.content.matchAll(
            /platform\.(?:core|workflows|context_engine)\.[a-z_]+/g
          ),
        ].map((match) => match[0])
      ),
    ];

    expect(referencedToolIds.length).toBeGreaterThan(0);

    const attachmentTypeIds = new Set([`${internalNamespaces.platformContextEngine}.ai_index`]);
    const attachmentScopedToolIds = new Set([
      `${internalNamespaces.platformContextEngine}.save_automation`,
    ]);
    const unboundReferences = referencedToolIds.filter(
      (toolId) =>
        !attachmentTypeIds.has(toolId) &&
        !attachmentScopedToolIds.has(toolId) &&
        !boundTools.includes(toolId)
    );
    expect(unboundReferences).toEqual([]);
  });

  it('mentions every referencedContent entry by name in the skill content', () => {
    for (const ref of kiAutomationGenerationSkill.referencedContent ?? []) {
      expect(kiAutomationGenerationSkill.content).toContain(ref.name);
    }
  });
});
