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

  it('carries no referenced content of its own, having delegated the mechanics', () => {
    expect(analyzeAndImproveSkill.referencedContent ?? []).toHaveLength(0);
  });

  it('binds only the read-only tools judging an index needs', async () => {
    const toolIds = (await analyzeAndImproveSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([
      platformCoreTools.executeEsql,
      platformCoreTools.listIndices,
      platformCoreTools.getIndexMapping,
      `${internalNamespaces.workflows}.get_workflow`,
    ]);
  });

  it('binds no tool that writes anything, so an unattended run stays a proposer', async () => {
    const toolIds = (await analyzeAndImproveSkill.getRegistryTools?.()) ?? [];

    // Skill tools are additive to the agent's own set, so this skill staying read-only is what
    // lets an analysis run load it without gaining the ability to author or run a workflow.
    // Anything that writes lives in `ai-index-automations`, which such a run does not load.
    expect(
      toolIds.some((id) =>
        /generate_workflow|execute_workflow|createKi|updateKi|deleteKi/i.test(id)
      )
    ).toBe(false);
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

    it('names each skill it delegates the mechanics to', () => {
      expect(content).toContain('context-engine-signals');
      expect(content).toContain('ai-index-sources');
      expect(content).toContain('ai-index-automations');
    });

    it('explains that staying read-only is why the split exists', () => {
      expect(content).toMatch(/Loading a skill adds its tools to yours/);
    });

    it('leaves applying versus proposing to the run rather than deciding it in the skill', () => {
      expect(content).toContain('Propose or apply — the run decides');
    });

    it('forbids hand-writing KIs, which would leave the producing automation unfixed', () => {
      expect(content).toContain('Never write knowledge indicator documents directly');
    });

    it('keeps the judgement it owns: what a KI is, its shape, and the strategies', () => {
      expect(content).toContain('What a knowledge indicator is');
      expect(content).toContain('KI document shape');
      expect(content).toContain('Access patterns');
      expect(content).toContain('Strategy catalog');
    });

    it('keeps the corpus filter as a diagnosis, delegating how to configure one', () => {
      expect(content).toContain('The corpus filter');
      expect(content).toMatch(/coverage-gap finding that does not\s+say which it is/);
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

    it('does not restate the signal mechanics it delegates', () => {
      // The field table, the ES|QL idioms and the traces join live in `context-engine-signals`.
      // Two copies drift, and a stale one here is worse than none.
      expect(content).not.toContain('field_extract(data, ');
      expect(content).not.toContain('MV_CONTAINS(tags,');
      expect(content).not.toContain('traces-agent_builder.otel-');
    });

    it('does not restate the workflow authoring mechanics it delegates', () => {
      expect(content).not.toContain('context-engine.verifyKi');
      expect(content).not.toContain('validate_workflow');
    });

    it('still names the three tags, which the reasoning about findings is written in', () => {
      expect(content).toContain('query_error');
      expect(content).toContain('empty_retrieval');
      expect(content).toContain('coverage_gap');
    });

    it('warns that signals never establish what the index holds', () => {
      expect(content).toMatch(/Signals say what agents asked for, never what the index holds/);
    });

    it('allows proposing nothing when the evidence is thin', () => {
      expect(content).toContain('When to propose nothing');
    });

    it('does not read an absence of signals as evidence of health', () => {
      expect(content).toContain('No signals, on an index that exists');
    });

    it('warns against re-proposing rejected improvements', () => {
      expect(content).toContain('already rejected');
    });
  });
});
