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

  it('has exactly two referencedContent entries', () => {
    expect(kiAutomationGenerationSkill.referencedContent).toHaveLength(2);
  });

  it('first referencedContent entry is the index-selection reference workflow', () => {
    const ref = kiAutomationGenerationSkill.referencedContent![0];
    expect(ref.name).toBe('index-selection-reference-workflow');
    expect(ref.relativePath).toBe('.');
    expect(ref.content.length).toBeGreaterThan(0);
  });

  it('second referencedContent entry is the AI Index JSON Schema with required fields', () => {
    const ref = kiAutomationGenerationSkill.referencedContent![1];
    expect(ref.name).toBe('ai-index-schema');
    expect(ref.relativePath).toBe('.');

    const schema = JSON.parse(ref.content) as Record<string, unknown>;
    expect(schema.type).toBe('object');

    const properties = schema.properties as Record<string, unknown>;
    expect(properties).toBeDefined();
    expect(properties).toHaveProperty('id');
    expect(properties).toHaveProperty('dest');
    expect(properties).toHaveProperty('sources');
    expect(properties).toHaveProperty('automations');
    expect(properties).toHaveProperty('date_created');
    expect(properties).toHaveProperty('date_modified');
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
});
