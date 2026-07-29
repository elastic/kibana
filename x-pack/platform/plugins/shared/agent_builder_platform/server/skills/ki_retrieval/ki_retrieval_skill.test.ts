/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { platformCoreTools } from '@kbn/agent-builder-common/tools';
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

  it('references the correct AI index pattern in content', () => {
    expect(kiRetrievalSkill.content).toContain('ai-index-*');
    expect(kiRetrievalSkill.content).not.toContain('ai-index-idx-*');
    expect(kiRetrievalSkill.content).not.toContain('ai-index-ds-*');
  });

  it('has no referencedContent', () => {
    expect(kiRetrievalSkill.referencedContent).toHaveLength(0);
  });

  it('binds the three required registry tools', async () => {
    const toolIds = (await kiRetrievalSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([
      platformCoreTools.executeEsql,
      platformCoreTools.listIndices,
    ]);
  });
});
