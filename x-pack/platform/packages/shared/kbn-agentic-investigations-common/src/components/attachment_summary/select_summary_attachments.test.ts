/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { selectSummaryAttachments } from './select_summary_attachments';
import type { SummaryAttachmentType } from './summary_attachment_types';

const SUMMARY_TYPES: readonly SummaryAttachmentType[] = [
  { name: 'Attack', types: ['security.attack_discovery'] },
  { name: 'Alert', types: ['security.alert', 'security.alerts'] },
  { name: 'Rule', types: ['security.rule'] },
  { name: 'Entity', types: ['security.entity'] },
];

interface AttachmentOverrides {
  id: string;
  type: string;
  /** `created_at` per version, in the order they should be stored. */
  versionTimes?: string[];
  hidden?: boolean;
  active?: boolean;
}

const makeAttachment = ({
  id,
  type,
  versionTimes = ['2026-09-01T10:00:00.000Z'],
  hidden,
  active,
}: AttachmentOverrides): VersionedAttachment => ({
  id,
  type,
  versions: versionTimes.map((createdAt, index) => ({
    version: index + 1,
    data: {},
    created_at: createdAt,
    content_hash: `${id}-${index}`,
  })),
  current_version: versionTimes.length,
  hidden,
  active,
});

const idsOf = (selected: ReturnType<typeof selectSummaryAttachments>) =>
  selected.map(({ attachment }) => attachment.id);

describe('selectSummaryAttachments', () => {
  it('orders by group before time', () => {
    const entity = makeAttachment({
      id: 'entity',
      type: 'security.entity',
      versionTimes: ['2026-09-01T08:00:00.000Z'],
    });
    const attack = makeAttachment({
      id: 'attack',
      type: 'security.attack_discovery',
      versionTimes: ['2026-09-01T12:00:00.000Z'],
    });

    expect(idsOf(selectSummaryAttachments([entity, attack], SUMMARY_TYPES))).toEqual([
      'attack',
      'entity',
    ]);
  });

  it('keeps a row in place when the attachment is updated', () => {
    // `first` was attached earliest but edited most recently.
    const first = makeAttachment({
      id: 'first',
      type: 'security.alert',
      versionTimes: ['2026-09-01T10:00:00.000Z', '2026-09-01T14:00:00.000Z'],
    });
    const second = makeAttachment({
      id: 'second',
      type: 'security.alert',
      versionTimes: ['2026-09-01T11:00:00.000Z'],
    });

    expect(idsOf(selectSummaryAttachments([second, first], SUMMARY_TYPES))).toEqual([
      'first',
      'second',
    ]);
  });

  it('interleaves the two alert types, because they share a group', () => {
    const single = makeAttachment({
      id: 'single',
      type: 'security.alert',
      versionTimes: ['2026-09-01T11:00:00.000Z'],
    });
    const batch = makeAttachment({
      id: 'batch',
      type: 'security.alerts',
      versionTimes: ['2026-09-01T10:00:00.000Z'],
    });

    expect(idsOf(selectSummaryAttachments([single, batch], SUMMARY_TYPES))).toEqual([
      'batch',
      'single',
    ]);
  });

  it('compares instants rather than strings, so mixed UTC offsets still order correctly', () => {
    // 09:00+02:00 is 07:00Z, so it precedes 08:00Z despite sorting after it as a string.
    const offset = makeAttachment({
      id: 'offset',
      type: 'security.alert',
      versionTimes: ['2026-09-01T09:00:00.000+02:00'],
    });
    const utc = makeAttachment({
      id: 'utc',
      type: 'security.alert',
      versionTimes: ['2026-09-01T08:00:00.000Z'],
    });

    expect(idsOf(selectSummaryAttachments([utc, offset], SUMMARY_TYPES))).toEqual([
      'offset',
      'utc',
    ]);
  });

  it.each([
    ['security.attack_discovery.verdict'],
    ['security.rule.preview'],
    ['security.exception'],
    ['security.investigation.timeline'],
    ['security.investigation.iocs'],
    ['security.entity_graph'],
    ['security.entity_risk_score_history'],
    ['security.entity_analytics_dashboard'],
    ['some.unknown.type'],
  ])('excludes %s', (type) => {
    const attachments = [
      makeAttachment({ id: 'kept', type: 'security.alert' }),
      makeAttachment({ id: 'dropped', type }),
    ];

    expect(idsOf(selectSummaryAttachments(attachments, SUMMARY_TYPES))).toEqual(['kept']);
  });

  it('excludes hidden and soft-deleted attachments, and keeps ones with no active flag', () => {
    const attachments = [
      makeAttachment({ id: 'kept', type: 'security.alert' }),
      makeAttachment({ id: 'hidden', type: 'security.alert', hidden: true }),
      makeAttachment({ id: 'deleted', type: 'security.alert', active: false }),
      makeAttachment({ id: 'explicitlyActive', type: 'security.alert', active: true }),
    ];

    expect(idsOf(selectSummaryAttachments(attachments, SUMMARY_TYPES)).sort()).toEqual([
      'explicitlyActive',
      'kept',
    ]);
  });

  it('falls back to the lowest version present when the first was pruned', () => {
    const pruned: VersionedAttachment = {
      id: 'pruned',
      type: 'security.alert',
      versions: [
        { version: 3, data: {}, created_at: '2026-09-01T09:00:00.000Z', content_hash: 'c' },
        { version: 2, data: {}, created_at: '2026-09-01T08:00:00.000Z', content_hash: 'b' },
      ],
      current_version: 3,
    };
    const later = makeAttachment({
      id: 'later',
      type: 'security.alert',
      versionTimes: ['2026-09-01T10:00:00.000Z'],
    });

    expect(idsOf(selectSummaryAttachments([later, pruned], SUMMARY_TYPES))).toEqual([
      'pruned',
      'later',
    ]);
  });

  it('sorts attachments with no usable timestamp last, without reordering between calls', () => {
    const undated: VersionedAttachment = {
      id: 'undated',
      type: 'security.alert',
      versions: [],
      current_version: 1,
    };
    const alsoUndated: VersionedAttachment = { ...undated, id: 'alsoUndated' };
    const dated = makeAttachment({ id: 'dated', type: 'security.alert' });

    expect(idsOf(selectSummaryAttachments([undated, alsoUndated, dated], SUMMARY_TYPES))).toEqual([
      'dated',
      'alsoUndated',
      'undated',
    ]);
    // Shuffled input, identical output: the id tie-break makes the order total.
    expect(idsOf(selectSummaryAttachments([dated, alsoUndated, undated], SUMMARY_TYPES))).toEqual([
      'dated',
      'alsoUndated',
      'undated',
    ]);
  });

  it.each([
    ['no attachments', undefined, SUMMARY_TYPES],
    ['an empty attachment list', [], SUMMARY_TYPES],
    ['no configured kinds', [makeAttachment({ id: 'a', type: 'security.alert' })], []],
  ])('returns nothing for %s', (_name, attachments, types) => {
    expect(selectSummaryAttachments(attachments, types)).toEqual([]);
  });
});
