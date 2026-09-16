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

  it('requires the prompt-provided space filter on every AI-index query', () => {
    expect(kiRetrievalSkill.content).toContain('pass its exact `filter`');
    expect(kiRetrievalSkill.content).toContain('on every AI-index query');
    expect(kiRetrievalSkill.content).toContain('`permissions.kibana.privileges`');
    expect(kiRetrievalSkill.content).toContain('including memory queries');
    expect(kiRetrievalSkill.content).not.toContain('`spaces` keyword field');
  });

  it('documents memory exclusion and recall', () => {
    expect(kiRetrievalSkill.content).toContain(
      'type != "memory.session" AND type != "memory.session_fact"'
    );
    expect(kiRetrievalSkill.content).toContain('Use `describe_ai_index`');
    expect(kiRetrievalSkill.content).toContain('expires_at IS NULL OR expires_at > NOW()');
    expect(kiRetrievalSkill.content).toContain('INLINE STATS latest_at = MAX(@timestamp) BY id');
    expect(kiRetrievalSkill.content).toContain(
      'governance.lifecycle.status IS NULL OR governance.lifecycle.status != "deleted"'
    );
    expect(kiRetrievalSkill.content).toContain('FIELD_EXTRACT(attributes, "memory.session_id")');
    expect(kiRetrievalSkill.content).toContain(
      'references.uri, references.relation, references.description'
    );
    expect(kiRetrievalSkill.content.indexOf('| WHERE @timestamp == latest_at')).toBeLessThan(
      kiRetrievalSkill.content.indexOf('expires_at IS NULL OR expires_at > NOW()')
    );
    // Session recall: DESC selects newest memories, ASC presents them chronologically.
    // updated_at (not @timestamp) is used because it reflects the last-write time on both
    // index-backed and data-stream destinations; @timestamp stays at creation time for indexes.
    const sessionSection = kiRetrievalSkill.content.slice(
      kiRetrievalSkill.content.indexOf('FIELD_EXTRACT(attributes, "memory.session_id")')
    );
    expect(sessionSection.indexOf('| SORT updated_at DESC')).toBeLessThan(
      sessionSection.indexOf('| LIMIT')
    );
    expect(sessionSection.indexOf('| LIMIT')).toBeLessThan(
      sessionSection.indexOf('| SORT @timestamp ASC')
    );
  });

  it('has no referencedContent', () => {
    expect(kiRetrievalSkill.referencedContent).toHaveLength(0);
  });

  it('binds the two required registry tools', async () => {
    const toolIds = (await kiRetrievalSkill.getRegistryTools?.()) ?? [];

    expect(toolIds).toEqual([platformCoreTools.executeEsql, platformCoreTools.listIndices]);
  });
});
