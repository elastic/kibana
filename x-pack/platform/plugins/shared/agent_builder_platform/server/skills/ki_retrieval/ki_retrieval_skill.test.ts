/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { contextEngineAiIndexTools } from '@kbn/agent-builder-common/tools';
import { kiRetrievalSkill } from './ki_retrieval_skill';

describe('kiRetrievalSkill', () => {
  it('registers with stable id, name, and context-engine base path', () => {
    expect(kiRetrievalSkill.id).toBe('ki-retrieval');
    expect(kiRetrievalSkill.name).toBe('ki-retrieval');
    expect(kiRetrievalSkill.basePath).toBe('skills/platform/context-engine');
  });

  it('is present in the built-in skills allow list', () => {
    expect(isAllowedBuiltinSkill(kiRetrievalSkill.id)).toBe(true);
  });

  it('is gated behind experimental features', () => {
    expect(kiRetrievalSkill.experimental).toBe(true);
  });

  it('ships non-empty markdown content', () => {
    expect(typeof kiRetrievalSkill.content).toBe('string');
    expect(kiRetrievalSkill.content.length).toBeGreaterThan(0);
  });

  it('queries the esql_target from the AI index tools instead of a hardcoded pattern', () => {
    expect(kiRetrievalSkill.content).toContain('FROM <esql_target>');
    expect(kiRetrievalSkill.content).not.toContain('ai-index-*');
  });

  it('reads AI indices only through the dedicated tools', () => {
    expect(kiRetrievalSkill.content).toContain('platform.context_engine.query_ai_indices');
    expect(kiRetrievalSkill.content).toContain(
      'Never read an AI Index with `platform.core.execute_esql`'
    );
    expect(kiRetrievalSkill.content).not.toContain('platform.core.list_indices');
  });

  it('keeps retrieval to the AI indices assigned to the agent', () => {
    expect(kiRetrievalSkill.content).toContain('search the AI Indices assigned to you');
    expect(kiRetrievalSkill.content).toContain('`assigned_to_agent: true`');
  });

  it('leaves space scoping to the server', () => {
    expect(kiRetrievalSkill.content).toContain('Never write a space');
    expect(kiRetrievalSkill.content).not.toContain('"filter"');
  });

  it('has no referencedContent', () => {
    expect(kiRetrievalSkill.referencedContent).toHaveLength(0);
  });

  it('binds the three AI index tools', async () => {
    const toolIds = (await kiRetrievalSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([
      contextEngineAiIndexTools.listAiIndices,
      contextEngineAiIndexTools.describeAiIndex,
      contextEngineAiIndexTools.queryAiIndices,
    ]);
  });
});
