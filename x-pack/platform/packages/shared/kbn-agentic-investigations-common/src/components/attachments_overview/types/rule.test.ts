/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode as risonDecode } from '@kbn/rison';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getRuleRow } from './rule';

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

const parseRulesTable = (url: string): { searchTerm?: string } => {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const raw = new URLSearchParams(url.slice(idx + 1));
  const val = raw.get('rulesTable');
  return val ? (risonDecode(val) as { searchTerm?: string }) : {};
};

describe('getRuleRow', () => {
  it('returns undefined for no attachments', () => {
    expect(getRuleRow([], getUrl)).toBeUndefined();
  });

  it('returns undefined when no rule has an origin', () => {
    const noOrigin = makeAttachment('security.rule', { text: '{}' });
    expect(getRuleRow([noOrigin], getUrl)).toBeUndefined();
  });

  it('deduplicates by origin', () => {
    const a = makeAttachment('security.rule', { text: '{}' }, { origin: 'same-sig' });
    const b = makeAttachment('security.rule', { text: '{}' }, { origin: 'same-sig' });
    const row = getRuleRow([a, b], getUrl)!;
    expect(row.label).toContain('1 rule');
  });

  it('links to /rules/management without a filter for multiple rules', () => {
    const a = makeAttachment(
      'security.rule',
      { text: '{}', attachmentLabel: 'Rule A' },
      { origin: 'sig-1' }
    );
    const b = makeAttachment(
      'security.rule',
      { text: '{}', attachmentLabel: 'Rule B' },
      { origin: 'sig-2' }
    );
    const row = getRuleRow([a, b], getUrl)!;
    expect(row.href).toBe('/app/security/rules/management');
  });

  it('links to /rules/management without a filter when single rule but no label', () => {
    const a = makeAttachment('security.rule', { text: '{}' }, { origin: 'sig-1' });
    const row = getRuleRow([a], getUrl)!;
    expect(row.href).toBe('/app/security/rules/management');
  });

  it('adds rulesTable searchTerm for a single rule with a label from attachmentLabel', () => {
    const a = makeAttachment(
      'security.rule',
      { text: '{}', attachmentLabel: 'Suspicious PowerShell' },
      { origin: 'sig-1' }
    );
    const row = getRuleRow([a], getUrl)!;
    expect(parseRulesTable(row.href).searchTerm).toBe('Suspicious PowerShell');
  });

  it('parses text.name when attachmentLabel is absent', () => {
    const data = { text: JSON.stringify({ name: 'Parsed Rule Name', query: 'host:*' }) };
    const a = makeAttachment('security.rule', data, { origin: 'sig-2' });
    const row = getRuleRow([a], getUrl)!;
    expect(parseRulesTable(row.href).searchTerm).toBe('Parsed Rule Name');
  });

  it('ignores inactive attachments', () => {
    const a = makeAttachment(
      'security.rule',
      { attachmentLabel: 'Rule' },
      { origin: 'sig-1', active: false }
    );
    expect(getRuleRow([a], getUrl)).toBeUndefined();
  });

  it('counts only attachments with an origin', () => {
    const withOrigin = makeAttachment(
      'security.rule',
      { attachmentLabel: 'R1' },
      { origin: 'sig-1' }
    );
    const noOrigin = makeAttachment('security.rule', { text: '{}' });
    const row = getRuleRow([withOrigin, noOrigin], getUrl)!;
    expect(row.label).toContain('1 rule');
  });
});
