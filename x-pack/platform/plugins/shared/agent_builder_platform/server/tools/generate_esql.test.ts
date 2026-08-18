/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlSessionId } from './generate_esql';

describe('buildEsqlSessionId', () => {
  it('prefixes the output with esql-gen-', () => {
    expect(buildEsqlSessionId('org-123')).toMatch(/^esql-gen-/);
    expect(buildEsqlSessionId()).toMatch(/^esql-gen-/);
  });

  it('hashes the org id — raw value does not appear in output', () => {
    const orgId = 'my-organization-id';
    expect(buildEsqlSessionId(orgId)).not.toContain(orgId);
  });

  it('is deterministic for the same org id', () => {
    const id = 'org-abc';
    expect(buildEsqlSessionId(id)).toBe(buildEsqlSessionId(id));
  });

  it('produces different ids for different org ids', () => {
    expect(buildEsqlSessionId('org-a')).not.toBe(buildEsqlSessionId('org-b'));
  });

  it('returns a 16-hex hash suffix when an org id is provided', () => {
    const result = buildEsqlSessionId('org-123');
    expect(result).toMatch(/^esql-gen-[0-9a-f]{16}$/);
  });

  it('falls back to a UUID-based suffix when no org id is provided', () => {
    const result = buildEsqlSessionId(undefined);
    // UUID has more than 16 chars; just verify structure and that something follows the prefix
    expect(result.length).toBeGreaterThan('esql-gen-'.length);
  });
});
