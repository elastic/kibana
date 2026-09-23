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

  it('has no referencedContent', () => {
    expect(analyzeAndImproveSkill.referencedContent).toHaveLength(0);
  });

  it('matches tags with MV_CONTAINS, never with a comparison operator', () => {
    // `tags` is multi-valued. A comparison operator applied to a multi-valued field evaluates to
    // null, so `tags == "<tag>"` matches only signals carrying that tag and no other — silently
    // dropping every multi-tag signal. Elasticsearch reports this as a warning, and execute_esql
    // does not surface warnings, so a regression here is invisible at runtime.
    expect(analyzeAndImproveSkill.content).not.toMatch(/\btags\s*(==|!=)/);
    expect(analyzeAndImproveSkill.content).toContain('MV_CONTAINS(tags,');
  });

  it('binds only read-only registry tools', async () => {
    const toolIds = (await analyzeAndImproveSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([
      platformCoreTools.executeEsql,
      platformCoreTools.listIndices,
      `${internalNamespaces.workflows}.get_workflow`,
      `${internalNamespaces.workflows}.validate_workflow`,
    ]);
  });

  it('binds no tool that could mutate an AI index', async () => {
    const toolIds = (await analyzeAndImproveSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).not.toContain(platformCoreTools.generateWorkflow);
    expect(toolIds).not.toContain(platformCoreTools.executeWorkflow);
    expect(toolIds.some((id) => /save|create|update|delete/i.test(id))).toBe(false);
  });

  describe('content', () => {
    const { content } = analyzeAndImproveSkill;

    it('states that the analysis proposes rather than applies changes', () => {
      expect(content).toContain('Propose, never apply');
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

    it('still forbids running a workflow, which validation must not be read as licence for', () => {
      expect(content).toContain('Do not execute the workflow');
    });
  });
});
