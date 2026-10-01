/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { extractAttachmentTargets } from './extract_attachment_targets';

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

const ALERT_INDEX = '.alerts-security.alerts-default-000001';

describe('extractAttachmentTargets', () => {
  describe('security.alert', () => {
    it('extracts _id when _index and _id are plain strings', () => {
      const data = { alert: JSON.stringify({ _id: 'abc123', _index: ALERT_INDEX }) };
      const { alertIds } = extractAttachmentTargets([makeAttachment('security.alert', data)]);
      expect(alertIds).toEqual(['abc123']);
    });

    it('extracts _id when both are arrays (flyout / getRawData path)', () => {
      const data = { alert: JSON.stringify({ _id: ['def456'], _index: [ALERT_INDEX] }) };
      const { alertIds } = extractAttachmentTargets([makeAttachment('security.alert', data)]);
      expect(alertIds).toEqual(['def456']);
    });

    it('skips attachments whose _index is not a security alert index (event from flyout_v2)', () => {
      const data = {
        alert: JSON.stringify({ _id: 'event1', _index: 'logs-endpoint.events.process-default' }),
      };
      const { alertIds } = extractAttachmentTargets([makeAttachment('security.alert', data)]);
      expect(alertIds).toEqual([]);
    });

    it('skips when data.alert is prose (agent-created)', () => {
      const data = { alert: 'This is a prose description of the alert' };
      const { alertIds } = extractAttachmentTargets([makeAttachment('security.alert', data)]);
      expect(alertIds).toEqual([]);
    });

    it('skips when data.alert is not a string', () => {
      const data = { alert: null };
      const { alertIds } = extractAttachmentTargets([makeAttachment('security.alert', data)]);
      expect(alertIds).toEqual([]);
    });

    it('deduplicates the same alert attached twice', () => {
      const data = { alert: JSON.stringify({ _id: 'dup', _index: ALERT_INDEX }) };
      const { alertIds } = extractAttachmentTargets([
        makeAttachment('security.alert', data),
        makeAttachment('security.alert', data),
      ]);
      expect(alertIds).toEqual(['dup']);
    });
  });

  describe('security.alerts', () => {
    it('extracts all ids from alertIds array', () => {
      const data = { alertIds: ['id1', 'id2', 'id3'] };
      const { alertIds } = extractAttachmentTargets([makeAttachment('security.alerts', data)]);
      expect(alertIds).toEqual(['id1', 'id2', 'id3']);
    });

    it('merges ids from security.alert and security.alerts and deduplicates', () => {
      const singleAlertData = { alert: JSON.stringify({ _id: 'shared', _index: ALERT_INDEX }) };
      const batchData = { alertIds: ['shared', 'unique'] };
      const { alertIds } = extractAttachmentTargets([
        makeAttachment('security.alert', singleAlertData),
        makeAttachment('security.alerts', batchData),
      ]);
      expect(alertIds).toEqual(['shared', 'unique']);
    });
  });

  describe('alerts timerange', () => {
    it('sets alertsCreatedAt to the earliest first-version created_at', () => {
      const earlier = makeAttachment('security.alerts', { alertIds: ['a'] });
      earlier.versions[0].created_at = '2026-09-10T00:00:00.000Z';
      const later = makeAttachment('security.alerts', { alertIds: ['b'] });
      later.versions[0].created_at = '2026-09-20T00:00:00.000Z';
      const { alertsCreatedAt, alertsUpdatedAt } = extractAttachmentTargets([later, earlier]);
      expect(alertsCreatedAt).toBe('2026-09-10T00:00:00.000Z');
      expect(alertsUpdatedAt).toBe('2026-09-20T00:00:00.000Z');
    });
  });

  describe('security.attack_discovery', () => {
    it('extracts data.id when present', () => {
      const data = {
        id: 'attack-uuid',
        alert_ids: [],
        details_markdown: '',
        summary_markdown: '',
        title: '',
      };
      const { attackIds } = extractAttachmentTargets([
        makeAttachment('security.attack_discovery', data),
      ]);
      expect(attackIds).toEqual(['attack-uuid']);
    });

    it('falls back to origin when data.id is absent', () => {
      const data = { alert_ids: [], details_markdown: '', summary_markdown: '', title: '' };
      const { attackIds } = extractAttachmentTargets([
        makeAttachment('security.attack_discovery', data, { origin: 'origin-uuid' }),
      ]);
      expect(attackIds).toEqual(['origin-uuid']);
    });

    it('skips security.attack_discovery.verdict (no ids)', () => {
      const data = { verdict: 'true_positive', summary_markdown: 'confirmed' };
      const { attackIds } = extractAttachmentTargets([
        makeAttachment('security.attack_discovery.verdict', data),
      ]);
      expect(attackIds).toEqual([]);
    });
  });

  describe('security.entity', () => {
    it('handles single-entity shape (no entityStoreId)', () => {
      const data = { identifierType: 'user', identifier: 'alice@corp' };
      const { entityKeys, entityTerms } = extractAttachmentTargets([
        makeAttachment('security.entity', data),
      ]);
      expect(entityKeys).toEqual(['user:alice@corp']);
      expect(entityTerms).toEqual(['alice@corp']);
    });

    it('uses entityStoreId as key and term when present', () => {
      const data = {
        identifierType: 'user',
        identifier: 'alice@corp',
        entityStoreId: 'user:alice@corp',
      };
      const { entityKeys, entityTerms } = extractAttachmentTargets([
        makeAttachment('security.entity', data),
      ]);
      expect(entityKeys).toEqual(['user:alice@corp']);
      expect(entityTerms).toEqual(['user:alice@corp']);
    });

    it('handles multi-entity shape', () => {
      const data = {
        entities: [
          { identifierType: 'host', identifier: 'web-01' },
          { identifierType: 'user', identifier: 'bob@corp', entityStoreId: 'user:bob@corp' },
        ],
      };
      const { entityKeys, entityTerms } = extractAttachmentTargets([
        makeAttachment('security.entity', data),
      ]);
      expect(entityKeys).toEqual(['host:web-01', 'user:bob@corp']);
      expect(entityTerms).toEqual(['web-01', 'user:bob@corp']);
    });

    it('deduplicates entities across multiple attachments', () => {
      const data = { identifierType: 'host', identifier: 'web-01' };
      const { entityKeys } = extractAttachmentTargets([
        makeAttachment('security.entity', data),
        makeAttachment('security.entity', data),
      ]);
      expect(entityKeys).toEqual(['host:web-01']);
    });
  });

  describe('security.rule', () => {
    it('counts only attachments with an origin', () => {
      const withOrigin = makeAttachment('security.rule', { text: '{}' }, { origin: 'rule-sig-1' });
      const noOrigin = makeAttachment('security.rule', { text: '{}' });
      const { ruleOrigins } = extractAttachmentTargets([withOrigin, noOrigin]);
      expect(ruleOrigins).toEqual(['rule-sig-1']);
    });

    it('deduplicates by origin', () => {
      const a = makeAttachment('security.rule', { text: '{}' }, { origin: 'same-sig' });
      const b = makeAttachment('security.rule', { text: '{}' }, { origin: 'same-sig' });
      const { ruleOrigins } = extractAttachmentTargets([a, b]);
      expect(ruleOrigins).toEqual(['same-sig']);
    });

    it('uses attachmentLabel as firstRuleLabel', () => {
      const data = { text: '{}', attachmentLabel: 'My Rule' };
      const { firstRuleLabel } = extractAttachmentTargets([
        makeAttachment('security.rule', data, { origin: 'sig-1' }),
      ]);
      expect(firstRuleLabel).toBe('My Rule');
    });

    it('parses text.name when attachmentLabel is absent', () => {
      const data = { text: JSON.stringify({ name: 'Parsed Rule Name', query: 'host:*' }) };
      const { firstRuleLabel } = extractAttachmentTargets([
        makeAttachment('security.rule', data, { origin: 'sig-2' }),
      ]);
      expect(firstRuleLabel).toBe('Parsed Rule Name');
    });

    it('sets firstRuleLabel to undefined for prose text', () => {
      const data = { text: 'Rule name: Foo\nError: too many gaps' };
      const { firstRuleLabel } = extractAttachmentTargets([
        makeAttachment('security.rule', data, { origin: 'sig-3' }),
      ]);
      expect(firstRuleLabel).toBeUndefined();
    });
  });

  it('ignores inactive attachments', () => {
    const data = { alertIds: ['id1'] };
    const inactive = makeAttachment('security.alerts', data, { active: false });
    const { alertIds } = extractAttachmentTargets([inactive]);
    expect(alertIds).toEqual([]);
  });

  it('returns all empty when attachments array is empty', () => {
    const result = extractAttachmentTargets([]);
    expect(result.alertIds).toEqual([]);
    expect(result.attackIds).toEqual([]);
    expect(result.entityKeys).toEqual([]);
    expect(result.ruleOrigins).toEqual([]);
    expect(result.alertsCreatedAt).toBeUndefined();
  });
});
