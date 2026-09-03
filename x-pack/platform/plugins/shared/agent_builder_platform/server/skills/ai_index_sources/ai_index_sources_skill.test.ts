/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { aiIndexSourcesSkill } from './ai_index_sources_skill';

describe('aiIndexSourcesSkill', () => {
  it('registers with stable id, name, and context-engine base path', () => {
    expect(aiIndexSourcesSkill.id).toBe('ai-index-sources');
    expect(aiIndexSourcesSkill.name).toBe('ai-index-sources');
    expect(aiIndexSourcesSkill.basePath).toBe('skills/platform/context-engine');
  });

  it('is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(aiIndexSourcesSkill.id)).toBe(true);
  });

  it('is gated behind experimental features', () => {
    expect(aiIndexSourcesSkill.experimental).toBe(true);
  });

  it('ships non-empty markdown content', () => {
    expect(typeof aiIndexSourcesSkill.content).toBe('string');
    expect(aiIndexSourcesSkill.content.length).toBeGreaterThan(0);
  });

  it('binds the tools that inspecting and validating a source needs', async () => {
    const toolIds = (await aiIndexSourcesSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([
      platformCoreTools.listIndices,
      platformCoreTools.getIndexMapping,
      platformCoreTools.executeEsql,
      platformCoreTools.generateEsql,
      `${internalNamespaces.workflows}.get_connectors`,
      `${internalNamespaces.workflows}.get_step_definitions`,
    ]);
  });

  it('binds nothing that runs or authors an automation', async () => {
    const toolIds = (await aiIndexSourcesSkill.getRegistryTools?.()) ?? [];

    expect(
      toolIds.some((id) => /generate_workflow|execute_workflow|createKi|updateKi/i.test(id))
    ).toBe(false);
  });

  it('only instructs the agent to call tools that are actually bound', async () => {
    const boundTools = (await aiIndexSourcesSkill.getRegistryTools?.()) ?? [];

    const referencedToolIds = [
      ...new Set(
        [
          ...aiIndexSourcesSkill.content.matchAll(
            /platform\.(?:core|workflows|context_engine)\.[a-z_]+/g
          ),
        ].map(([match]) => match)
      ),
    ];

    expect(referencedToolIds.length).toBeGreaterThan(0);
    expect(referencedToolIds.filter((toolId) => !boundTools.includes(toolId))).toEqual([]);
  });

  describe('content', () => {
    const { content } = aiIndexSourcesSkill;

    it('describes both source kinds', () => {
      expect(content).toContain('`esql`');
      expect(content).toContain('`connector`');
    });

    it('carries the corpus filter, which bounds every automation reading the source', () => {
      expect(content).toContain('The corpus filter');
    });

    it('refuses a source that was never queried', () => {
      expect(content).toContain('Never propose a source you have not queried');
    });

    it('gives an order for telling a source gap from a generation gap', () => {
      expect(content).toContain('Diagnosing a source');
    });

    it('warns that removing a source leaves its indicators behind', () => {
      expect(content).toMatch(/Removing a source does not remove the indicators it produced/);
    });

    it('points at the skills on either side of it', () => {
      expect(content).toContain('analyze-and-improve');
      expect(content).toContain('ai-index-automations');
    });
  });
});
