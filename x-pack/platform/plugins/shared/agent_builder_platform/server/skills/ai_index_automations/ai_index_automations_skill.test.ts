/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { aiIndexAutomationsSkill } from './ai_index_automations_skill';

describe('aiIndexAutomationsSkill', () => {
  it('registers with stable id, name, and context-engine base path', () => {
    expect(aiIndexAutomationsSkill.id).toBe('ai-index-automations');
    expect(aiIndexAutomationsSkill.name).toBe('ai-index-automations');
    expect(aiIndexAutomationsSkill.basePath).toBe('skills/platform/context-engine');
  });

  it('is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(aiIndexAutomationsSkill.id)).toBe(true);
  });

  it('is gated behind experimental features', () => {
    expect(aiIndexAutomationsSkill.experimental).toBe(true);
  });

  it('ships non-empty markdown content', () => {
    expect(typeof aiIndexAutomationsSkill.content).toBe('string');
    expect(aiIndexAutomationsSkill.content.length).toBeGreaterThan(0);
  });

  it('carries the index-selection reference workflow as its one referencedContent entry', () => {
    expect(aiIndexAutomationsSkill.referencedContent).toHaveLength(1);
    const [reference] = aiIndexAutomationsSkill.referencedContent!;
    expect(reference.name).toBe('index-selection-reference-workflow');
    expect(reference.relativePath).toBe('.');
    expect(reference.content.length).toBeGreaterThan(0);
  });

  it('mentions every referencedContent entry by name in the skill content', () => {
    for (const reference of aiIndexAutomationsSkill.referencedContent ?? []) {
      expect(aiIndexAutomationsSkill.content).toContain(reference.name);
    }
  });

  it('is the skill that carries the authoring and execution tools', async () => {
    const toolIds = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([
      platformCoreTools.generateWorkflow,
      platformCoreTools.executeWorkflow,
      platformCoreTools.getWorkflowExecutionStatus,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
      `${internalNamespaces.workflows}.validate_workflow`,
      `${internalNamespaces.workflows}.get_workflow`,
      `${internalNamespaces.workflows}.get_step_definitions`,
      `${internalNamespaces.workflows}.get_examples`,
      `${internalNamespaces.workflows}.get_connectors`,
    ]);
  });

  it('binds no tool that writes a KI directly, since KIs come from automations', async () => {
    const toolIds = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    expect(toolIds.some((id) => /createKi|updateKi|deleteKi/i.test(id))).toBe(false);
  });

  it('only instructs the agent to call tools that are actually bound', async () => {
    const boundTools = (await aiIndexAutomationsSkill.getRegistryTools?.()) ?? [];

    const referencedToolIds = [
      ...new Set(
        [
          ...aiIndexAutomationsSkill.content.matchAll(
            /platform\.(?:core|workflows|context_engine)\.[a-z_]+/g
          ),
        ].map(([match]) => match)
      ),
    ];

    expect(referencedToolIds.length).toBeGreaterThan(0);
    expect(referencedToolIds.filter((toolId) => !boundTools.includes(toolId))).toEqual([]);
  });

  describe('content', () => {
    const { content } = aiIndexAutomationsSkill;

    it('requires reading an automation before making a claim about it', () => {
      expect(content).toContain('Read the automation before you say anything about it');
    });

    it('states the sink contract every automation has to satisfy', () => {
      expect(content).toContain('context-engine.verifyKi');
      expect(content).toContain('ki_id');
      expect(content).toContain('attributes.esql');
    });

    it('carries a workflow shape for every strategy the analysis skill can choose', () => {
      for (const strategy of [
        'Index/Table Metadata',
        'Bottom-Up',
        'Selective / Outlier',
        'Atomic Facts',
        'Cumulative / Wiki-style',
        'Detection / Feature',
      ]) {
        expect(content).toContain(strategy);
      }
    });

    it('requires workflow YAML to be validated before it is proposed', () => {
      expect(content).toContain('Validate before you propose');
      expect(content).toContain(`${internalNamespaces.workflows}.validate_workflow`);
    });

    it('does not let validating a workflow be read as licence to run it', () => {
      expect(content).toContain('Running one is a separate decision');
      expect(content).toMatch(/Do not execute a workflow unless\s+the run you are in has told you/);
    });

    it('points at the workflow authoring skill for definition syntax', () => {
      expect(content).toContain('workflow-authoring');
    });

    it('notes the ES|QL row cap, which otherwise truncates a large corpus silently', () => {
      expect(content).toContain('10,000');
    });

    it('points at the skills on either side of it', () => {
      expect(content).toContain('analyze-and-improve');
      expect(content).toContain('ai-index-sources');
    });
  });
});
