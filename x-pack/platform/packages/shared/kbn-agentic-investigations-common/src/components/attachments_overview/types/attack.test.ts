/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode as risonDecode } from '@kbn/rison';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getAttackRow } from './attack';

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

const parseParams = (url: string): Record<string, unknown> => {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const raw = new URLSearchParams(url.slice(idx + 1));
  const result: Record<string, unknown> = {};
  for (const [key, value] of raw.entries()) {
    try {
      result[key] = risonDecode(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
};

describe('getAttackRow', () => {
  it('returns undefined for no attachments', () => {
    expect(getAttackRow([], getUrl)).toBeUndefined();
  });

  it('extracts data.id when present', () => {
    const data = {
      id: 'attack-uuid',
      alert_ids: [],
      details_markdown: '',
      summary_markdown: '',
      title: '',
    };
    const row = getAttackRow([makeAttachment('security.attack_discovery', data)], getUrl);
    expect(row?.href).toContain('/attacks?');
    expect(row?.label).toContain('1 attack');
  });

  it('falls back to origin when data.id is absent', () => {
    const data = { alert_ids: [], details_markdown: '', summary_markdown: '', title: '' };
    const row = getAttackRow(
      [makeAttachment('security.attack_discovery', data, { origin: 'origin-uuid' })],
      getUrl
    );
    expect(row).toBeDefined();
    expect(row?.label).toContain('1 attack');
  });

  it('skips security.attack_discovery.verdict (no ids)', () => {
    const data = { verdict: 'true_positive', summary_markdown: 'confirmed' };
    expect(
      getAttackRow([makeAttachment('security.attack_discovery.verdict', data)], getUrl)
    ).toBeUndefined();
  });

  it('deduplicates attacks with the same id', () => {
    const data = { id: 'atk1' };
    const row = getAttackRow(
      [
        makeAttachment('security.attack_discovery', data),
        makeAttachment('security.attack_discovery', data),
      ],
      getUrl
    );
    expect(row?.label).toContain('1 attack');
  });

  it('ignores inactive attachments', () => {
    const data = { id: 'atk1' };
    expect(
      getAttackRow([makeAttachment('security.attack_discovery', data, { active: false })], getUrl)
    ).toBeUndefined();
  });

  it('applies the same phrases filter pattern as alerts', () => {
    const data = { id: 'atk1' };
    const b = makeAttachment('security.attack_discovery', { id: 'atk2' });
    const row = getAttackRow([makeAttachment('security.attack_discovery', data), b], getUrl)!;
    const params = parseParams(row.href) as Record<
      string,
      Array<{ meta: { type: string; key: string; params: string[] } }>
    >;
    expect(params.filters[0].meta.type).toBe('phrases');
    expect(params.filters[0].meta.key).toBe('_id');
  });

  it('does not set a KQL query param', () => {
    const row = getAttackRow(
      [makeAttachment('security.attack_discovery', { id: 'atk1' })],
      getUrl
    )!;
    expect(parseParams(row.href).query).toBeUndefined();
  });
});
