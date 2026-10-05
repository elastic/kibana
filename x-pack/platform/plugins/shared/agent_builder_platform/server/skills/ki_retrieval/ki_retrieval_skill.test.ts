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

  it('queries the AI index targets in content', () => {
    expect(kiRetrievalSkill.content).toContain('FROM <targets> METADATA _id, _index, _score');
    expect(kiRetrievalSkill.content).not.toContain('FROM ai-index-*');
    expect(kiRetrievalSkill.content).not.toContain('v-ai-index-');
  });

  it('routes every AI-index query through the space-scoped query tool', () => {
    expect(kiRetrievalSkill.content).toContain(
      `every AI-index query below through\n\`${contextEngineAiIndexTools.queryAiIndices}\``
    );
    expect(kiRetrievalSkill.content).not.toContain('"filter"');
  });

  it('opens every template with the lifecycle filters the query tool also applies', () => {
    const templates = kiRetrievalSkill.content.match(
      /FROM <targets> METADATA _id, _index, _score\n/g
    );
    const withLifecycle = kiRetrievalSkill.content.match(
      /FROM <targets> METADATA _id, _index, _score\n\| WHERE governance\.lifecycle\.status IS NULL OR governance\.lifecycle\.status == "active"\n\| WHERE expires_at IS NULL OR expires_at > NOW\(\)\n/g
    );

    expect(templates?.length).toBeGreaterThan(0);
    expect(withLifecycle?.length).toBe(templates?.length);
    expect(kiRetrievalSkill.content).toContain('and `DROP governance.*`');
    expect(kiRetrievalSkill.content).toContain('switches off its default only');
  });

  it('keeps retrieval to the AI indices assigned to the agent', () => {
    expect(kiRetrievalSkill.content).toContain('search the AI Indices assigned to you');
    expect(kiRetrievalSkill.content).toContain('`assigned_to_agent: true`');
  });

  it('filters multi-valued tags with the match operator, not equality', () => {
    expect(kiRetrievalSkill.content).toContain('| WHERE tags:"<tag>"\n');
    expect(kiRetrievalSkill.content).toContain('filter `tags` with `:`, not `==`');
    expect(kiRetrievalSkill.content).not.toMatch(/tags\s*==/);
  });

  it('has no referencedContent', () => {
    expect(kiRetrievalSkill.referencedContent).toHaveLength(0);
  });

  it('binds the Context Engine AI index tools', async () => {
    const toolIds = (await kiRetrievalSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual(Object.values(contextEngineAiIndexTools));
  });
});
