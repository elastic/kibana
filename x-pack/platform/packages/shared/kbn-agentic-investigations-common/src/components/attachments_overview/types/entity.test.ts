/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode as risonDecode } from '@kbn/rison';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getEntityRow } from './entity';

const makeAttachment = (
  type: string,
  data: unknown,
  overrides: Partial<VersionedAttachment> = {}
): VersionedAttachment => ({
  id: `${type}-${Math.random()}`,
  type,
  versions: [{ version: 1, data, created_at: '2026-09-20T12:00:00.000Z', content_hash: 'a' }],
  current_version: 1,
  active: true,
  ...overrides,
});

const getUrl = (path: string) => `/app/security${path}`;

const parseCspq = (url: string): { query: { query: string } } => {
  const idx = url.indexOf('?');
  const raw = new URLSearchParams(url.slice(idx + 1));
  return risonDecode(raw.get('cspq')!) as { query: { query: string } };
};

describe('getEntityRow', () => {
  it('returns undefined for no attachments', () => {
    expect(getEntityRow([], getUrl)).toBeUndefined();
  });

  it('handles single-entity shape (no entityStoreId)', () => {
    const data = { identifierType: 'user', identifier: 'alice@corp' };
    const row = getEntityRow([makeAttachment('security.entity', data)], getUrl)!;
    expect(row.href).toContain('/entity_analytics_home_page?');
    expect(row.label).toContain('1 entity');
    const cspq = parseCspq(row.href);
    expect(cspq.query.query).toContain('alice@corp');
  });

  it('uses entityStoreId as the query term when present', () => {
    const data = {
      identifierType: 'user',
      identifier: 'alice@corp',
      entityStoreId: 'user:alice@corp',
    };
    const row = getEntityRow([makeAttachment('security.entity', data)], getUrl)!;
    const cspq = parseCspq(row.href);
    expect(cspq.query.query).toContain('user:alice@corp');
  });

  it('handles multi-entity shape', () => {
    const data = {
      entities: [
        { identifierType: 'host', identifier: 'web-01' },
        { identifierType: 'user', identifier: 'bob@corp', entityStoreId: 'user:bob@corp' },
      ],
    };
    const row = getEntityRow([makeAttachment('security.entity', data)], getUrl)!;
    expect(row.label).toContain('2 entities');
    const cspq = parseCspq(row.href);
    expect(cspq.query.query).toContain('web-01');
    expect(cspq.query.query).toContain('user:bob@corp');
  });

  it('deduplicates entities across multiple attachments', () => {
    const data = { identifierType: 'host', identifier: 'web-01' };
    const row = getEntityRow(
      [makeAttachment('security.entity', data), makeAttachment('security.entity', data)],
      getUrl
    )!;
    expect(row.label).toContain('1 entity');
  });

  it('ignores inactive attachments', () => {
    const data = { identifierType: 'host', identifier: 'web-01' };
    expect(
      getEntityRow([makeAttachment('security.entity', data, { active: false })], getUrl)
    ).toBeUndefined();
  });

  it('ignores hidden attachments', () => {
    const data = { identifierType: 'host', identifier: 'web-01' };
    expect(
      getEntityRow([makeAttachment('security.entity', data, { hidden: true })], getUrl)
    ).toBeUndefined();
  });

  it('puts entity terms into cspq query language kuery', () => {
    const data = { identifierType: 'user', identifier: 'alice@corp' };
    const row = getEntityRow([makeAttachment('security.entity', data)], getUrl)!;
    const cspq = parseCspq(row.href);
    expect(cspq.query.query).toContain('entity.id');
    expect(cspq.query.query).toContain('entity.name');
  });
});
