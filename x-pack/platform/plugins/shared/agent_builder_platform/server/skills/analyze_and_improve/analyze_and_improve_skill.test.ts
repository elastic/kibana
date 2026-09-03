/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { analyzeAndImproveSkill } from './analyze_and_improve_skill';

describe('analyzeAndImproveSkill', () => {
  it('registers with stable id, name, and context-engine base path', () => {
    expect(analyzeAndImproveSkill.id).toBe('analyze-and-improve');
    expect(analyzeAndImproveSkill.name).toBe('analyze-and-improve');
    expect(analyzeAndImproveSkill.basePath).toBe('skills/platform/context-engine');
  });

  it('is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(analyzeAndImproveSkill.id)).toBe(true);
  });

  it('is gated behind experimental features', () => {
    expect(analyzeAndImproveSkill.experimental).toBe(true);
  });

  it('is not excluded from Elastic capabilities, so the default agent picks it up', () => {
    expect(analyzeAndImproveSkill.excludeFromElasticCapabilities).toBeFalsy();
  });

  it('ships non-empty markdown content', () => {
    expect(typeof analyzeAndImproveSkill.content).toBe('string');
    expect(analyzeAndImproveSkill.content.length).toBeGreaterThan(0);
  });

  it('carries the index-selection reference workflow as its one referencedContent entry', () => {
    expect(analyzeAndImproveSkill.referencedContent).toHaveLength(1);
    const [reference] = analyzeAndImproveSkill.referencedContent!;
    expect(reference.name).toBe('index-selection-reference-workflow');
    expect(reference.relativePath).toBe('.');
    expect(reference.content.length).toBeGreaterThan(0);
  });

  it('mentions every referencedContent entry by name in the skill content', () => {
    for (const reference of analyzeAndImproveSkill.referencedContent ?? []) {
      expect(analyzeAndImproveSkill.content).toContain(reference.name);
    }
  });

  it('matches tags with MV_CONTAINS, never with a comparison operator', () => {
    // `tags` is multi-valued. A comparison operator applied to a multi-valued field evaluates to
    // null, so `tags == "<tag>"` matches only signals carrying that tag and no other — silently
    // dropping every multi-tag signal. Elasticsearch reports this as a warning, and execute_esql
    // does not surface warnings, so a regression here is invisible at runtime.
    expect(analyzeAndImproveSkill.content).not.toMatch(/\btags\s*(==|!=)/);
    expect(analyzeAndImproveSkill.content).toContain('MV_CONTAINS(tags,');
  });

  it('binds the tools both diagnosing an index and authoring its automations need', async () => {
    const toolIds = (await analyzeAndImproveSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([
      platformCoreTools.generateWorkflow,
      platformCoreTools.executeWorkflow,
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
      platformCoreTools.listIndices,
      platformCoreTools.getIndexMapping,
      platformCoreTools.getWorkflowExecutionStatus,
      `${internalNamespaces.workflows}.validate_workflow`,
      `${internalNamespaces.workflows}.get_workflow`,
      `${internalNamespaces.workflows}.get_step_definitions`,
      `${internalNamespaces.workflows}.get_examples`,
      `${internalNamespaces.workflows}.get_connectors`,
    ]);
  });

  it('binds no tool that writes a KI directly, since KIs come from automations', async () => {
    const toolIds = (await analyzeAndImproveSkill.getRegistryTools?.()) ?? [];

    expect(toolIds.some((id) => /createKi|updateKi|deleteKi/i.test(id))).toBe(false);
  });

  it('only instructs the agent to call tools that are actually bound', async () => {
    const boundTools = (await analyzeAndImproveSkill.getRegistryTools?.()) ?? [];

    // Every `platform.*` tool id the content tells the agent to call must be bound, so prose
    // cannot drift into promising a capability the skill does not hand over.
    const referencedToolIds = [
      ...new Set(
        [
          ...analyzeAndImproveSkill.content.matchAll(
            /platform\.(?:core|workflows|context_engine)\.[a-z_]+/g
          ),
        ].map(([match]) => match)
      ),
    ];

    expect(referencedToolIds.length).toBeGreaterThan(0);
    expect(referencedToolIds.filter((toolId) => !boundTools.includes(toolId))).toEqual([]);
  });

  describe('content', () => {
    const { content } = analyzeAndImproveSkill;

    it('leaves applying versus proposing to the run rather than deciding it in the skill', () => {
      expect(content).toContain('Propose or apply — the run decides');
    });

    it('forbids hand-writing KIs, which would leave the producing automation unfixed', () => {
      expect(content).toContain('Never write knowledge indicator documents directly');
    });

    it('covers the setup half: what a KI is, its shape, access patterns, and the strategies', () => {
      expect(content).toContain('What a knowledge indicator is');
      expect(content).toContain('KI document shape');
      expect(content).toContain('Access patterns');
      expect(content).toContain('Strategy catalog');
    });

    it('carries the corpus filter, which bounds generation and explains coverage gaps', () => {
      expect(content).toContain('The corpus filter');
    });

    it('uses one calibrated confidence scale for both KIs and findings', () => {
      expect(content).toContain('attributes.confidence');
      expect(content).toMatch(/0\.9–1\.0/);
      expect(content).toContain('Do not emit');
    });

    it('carries no human-in-the-loop choreography, which belongs to the invoking run', () => {
      expect(content).not.toContain('ask_user_question');
      expect(content).not.toContain('save_automation');
    });

    it('documents the signals index and the three classification tags', () => {
      expect(content).toContain('context-engine-signals-*');
      expect(content).toContain('query_error');
      expect(content).toContain('empty_retrieval');
      expect(content).toContain('coverage_gap');
    });

    it('explains that flattened sub-fields need field_extract in ES|QL', () => {
      expect(content).toContain('flattened');
      expect(content).toContain('field_extract(data, ');
    });

    it('tells the agent to prefer the signals handed to it by the run', () => {
      expect(content).toContain('Prefer the signals you were given');
    });

    it('allows proposing nothing when the evidence is thin', () => {
      expect(content).toContain('When to propose nothing');
    });

    it('warns against re-proposing rejected improvements', () => {
      expect(content).toContain('already rejected');
    });

    it('points at the traces skill rather than restating how the traces index is shaped', () => {
      expect(content).toContain('agent-builder-traces');
    });

    it('points at the workflow authoring skill for definition syntax', () => {
      expect(content).toContain('workflow-authoring');
    });

    it('requires workflow YAML to be validated before it is proposed', () => {
      expect(content).toContain('Validate any workflow YAML before you propose it');
      expect(content).toContain(`${internalNamespaces.workflows}.validate_workflow`);
    });

    it('does not let validating a workflow be read as licence to run it', () => {
      expect(content).toMatch(/Do not execute a workflow unless\s+the run has told you to/);
    });
  });
});
