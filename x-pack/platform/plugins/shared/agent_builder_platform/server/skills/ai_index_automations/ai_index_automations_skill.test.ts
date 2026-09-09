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
      `${internalNamespaces.workflows}.get_trigger_definitions`,
      `${internalNamespaces.workflows}.get_examples`,
      `${internalNamespaces.workflows}.get_connectors`,
      `${internalNamespaces.workflows}.workflow_execute_step`,
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

    it('requires hand-edited workflow YAML to be validated before it is proposed', () => {
      expect(content).toMatch(/Validation is\s+for the YAML you changed/);
      expect(content).toContain(`${internalNamespaces.workflows}.validate_workflow`);
    });

    it('scaffolds through generation once, then edits the definition as text', () => {
      expect(content).toMatch(/Scaffold it once, then take the YAML into text/);
      expect(content).toContain('attachments.read');
      expect(content).toMatch(/all take a raw `yaml` string/);
    });

    it('warns that re-generating to make an edit re-rolls what was already settled', () => {
      expect(content).toMatch(/re-rolls parts of the workflow you had\s+already settled/);
    });

    it('points at the lookup tools that cover built-in and connector step types', () => {
      expect(content).toContain(`${internalNamespaces.workflows}.get_step_definitions`);
      expect(content).toContain(`${internalNamespaces.workflows}.get_trigger_definitions`);
      expect(content).toContain(`${internalNamespaces.workflows}.get_examples`);
    });

    it('offers single-step execution for isolating a failing step', () => {
      expect(content).toContain(`${internalNamespaces.workflows}.workflow_execute_step`);
      expect(content).toMatch(/runs that step alone out of the inline YAML/);
    });

    it('delegates the build-and-test loop rather than saving an unrun draft', () => {
      expect(content).toContain('delegate the build-and-test loop to a subagent');
      expect(content).toMatch(/A workflow that has never run is a guess/);
      expect(content).toMatch(/complete final YAML must come back verbatim/);
    });

    it('bounds the iteration, since the subagent shares the run step limit', () => {
      expect(content).toMatch(/at most three attempts/);
    });

    it('tells the brief to say why workflow-authoring is needed, which its own description denies', () => {
      expect(content).toMatch(/an instruction to load `workflow-authoring` too, and why/);
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
      expect(content).toMatch(/it validates its own output/);
      expect(content).toMatch(/Do not re-validate the scaffold as it came back/);
    });

    it('writes out the context-engine step contracts, which no discovery tool can return', () => {
      expect(content).toContain('The `context-engine` step contracts');
      expect(content).toMatch(/no discovery tool can see them/);

      for (const stepType of [
        'context-engine.createKi',
        'context-engine.updateKi',
        'context-engine.deleteKi',
        'context-engine.verifyKi',
      ]) {
        expect(content).toContain(stepType);
      }
    });

    it('names both verifier ids, since an unknown id fails the step', () => {
      expect(content).toContain('esql-valid-syntax');
      expect(content).toContain('esql-valid-runtime');
    });

    it('states the createKi id rules that make a re-run idempotent', () => {
      expect(content).toMatch(/Passing the same `ki_id` again replaces the indicator/);
      expect(content).toMatch(/On a data-stream destination `ki_id` is rejected/);
    });

    it('bounds what a KI attribute can hold, since indicators carry ES|QL in one', () => {
      expect(content).toMatch(/never nested objects/);
      expect(content).toContain('10,000 characters');
    });

    it('says why updateKi is not interchangeable with createKi', () => {
      expect(content).toMatch(/It fails when the indicator does not\s+exist/);
      expect(content).toMatch(/not a substitute\s+for `createKi`/);
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
