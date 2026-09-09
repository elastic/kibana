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

    it('requires hand-written workflow YAML to be validated before it is proposed', () => {
      expect(content).toMatch(/Draft it, and validate what you wrote yourself/);
      expect(content).toContain(`${internalNamespaces.workflows}.validate_workflow`);
    });

    it('delegates the build-and-test loop rather than saving an unrun draft', () => {
      expect(content).toContain('delegate the build-and-test loop to a subagent');
      expect(content).toMatch(/A workflow that has never run is a guess/);
      expect(content).toMatch(/complete final YAML must come back verbatim/);
    });

    it('bounds the iteration, since the subagent shares the run step limit', () => {
      expect(content).toMatch(/at most three attempts/);
    });

    it('requires the pilot to tag its indicators and delete them afterwards', () => {
      expect(content).toContain('ce-pilot-');
      expect(content).toContain('context-engine.deleteKi');
      expect(content).toMatch(/cleanup is not optional/);
    });

    it('notes that a data stream leaves the tag as the only handle on pilot output', () => {
      expect(content).toMatch(/createKi` refuses `ki_id`/);
    });

    it('saves the piloted definition rather than a regenerated one', () => {
      expect(content).toMatch(/Save the YAML exactly as the subagent returned it/);
    });

    it('does not ask for a second validation of what generate_workflow already validated', () => {
      expect(content).toMatch(/generate_workflow` validates its own output/);
      expect(content).toMatch(/Do not re-validate what it gave you/);
    });

    it('names the check validation does not cover, since a valid draft can still match nothing', () => {
      expect(content).toMatch(/does \*\*not\*\* establish that a query inside it returns anything/);
      expect(content).toContain(platformCoreTools.executeEsql);
    });

    it('does not let piloting a workflow be read as licence to run the saved one', () => {
      expect(content).toContain('Running one is a separate decision');
      expect(content).toMatch(
        /Do not execute a saved workflow unless the run you are in has told you/
      );
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
