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

  it('description does not contain the word "workflow" to avoid spurious skill loading', () => {
    expect(kiAutomationGenerationSkill.description.toLowerCase()).not.toContain('workflow');
  });

  it('description mentions Context Engine and KI', () => {
    expect(kiAutomationGenerationSkill.description).toContain('Context Engine');
    expect(kiAutomationGenerationSkill.description).toContain('KI');
  });

  it('content does not contain the word "librarian"', () => {
    expect(kiAutomationGenerationSkill.content).not.toContain('librarian');
  });

  it('content does not contain "maps[]" or "maps contract"', () => {
    expect(kiAutomationGenerationSkill.content).not.toContain('maps[]');
    expect(kiAutomationGenerationSkill.content).not.toContain('maps contract');
  });

  it('content contains "access patterns"', () => {
    expect(kiAutomationGenerationSkill.content.toLowerCase()).toContain('access pattern');
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
