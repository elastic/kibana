/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiSummaryMetadataDoc } from './ai_summary_metadata';
import { getMetadataComponentTemplate } from '../../../server/domain/asset_manager/metadata_component_templates';

describe('AiSummaryMetadataDoc', () => {
  const minimalRequired = {
    '@timestamp': '2026-06-01T10:00:00.000Z',
    'event.kind': 'event',
    'event.action': 'ai_summary_generated',
    'entity.id': 'user:alice@local',
    'entity.type': 'user',
    'Ai_summary.generated_by': 'alice',
    'Ai_summary.generated_at': 1748771200000,
    'Ai_summary.highlights': [{ title: 'Risk overview', text: 'Entity has elevated risk score.' }],
    'Ai_summary.staleness': {
      enabled_signals: ['risk_score'] as Array<'risk_score'>,
      snapshot: { risk_score: 72.5 },
    },
  } satisfies AiSummaryMetadataDoc;

  it('accepts a minimal document with only the required fields', () => {
    expect(minimalRequired['@timestamp']).toBe('2026-06-01T10:00:00.000Z');
    expect(minimalRequired['event.kind']).toBe('event');
    expect(minimalRequired['event.action']).toBe('ai_summary_generated');
    expect(minimalRequired['entity.id']).toBe('user:alice@local');
    expect(minimalRequired['entity.type']).toBe('user');
    expect(minimalRequired['Ai_summary.generated_by']).toBe('alice');
    expect(minimalRequired['Ai_summary.generated_at']).toBe(1748771200000);
    expect(minimalRequired['Ai_summary.highlights']).toHaveLength(1);
  });

  it('accepts a document with all optional fields populated', () => {
    const fullDoc: AiSummaryMetadataDoc = {
      '@timestamp': '2026-06-01T10:00:00.000Z',
      'event.kind': 'event',
      'event.action': 'ai_summary_generated',
      'event.ingested': '2026-06-01T10:00:05.000Z',
      'entity.id': 'user:alice@local',
      'entity.type': 'user',
      'Ai_summary.generated_by': 'alice',
      'Ai_summary.author_profile_uid': 'u_alice_profile',
      'Ai_summary.generated_at': 1748771200000,
      'Ai_summary.highlights': [
        { title: 'Risk overview', text: 'Entity has elevated risk score.' },
      ],
      'Ai_summary.recommended_actions': ['Investigate login activity'],
      'Ai_summary.anomaly_job_ids': ['security-job-1'],
      'Ai_summary.variant_id': 'default',
      'Ai_summary.staleness': {
        enabled_signals: ['risk_score'] as Array<'risk_score'>,
        snapshot: { risk_score: 72.5 },
      },
    };
    expect(fullDoc['event.ingested']).toBe('2026-06-01T10:00:05.000Z');
    expect(fullDoc['Ai_summary.author_profile_uid']).toBe('u_alice_profile');
    expect(fullDoc['Ai_summary.recommended_actions']).toEqual(['Investigate login activity']);
    expect(fullDoc['Ai_summary.anomaly_job_ids']).toEqual(['security-job-1']);
    expect(fullDoc['Ai_summary.variant_id']).toBe('default');
  });

  it('pins event.kind to the literal "event"', () => {
    const eventKind: AiSummaryMetadataDoc['event.kind'] = 'event';
    expect(eventKind).toBe('event');
    // @ts-expect-error event.kind must be the literal 'event'
    const badKind: AiSummaryMetadataDoc['event.kind'] = 'state';
    expect(badKind).toBe('state');
  });

  it('pins event.action to the literal "ai_summary_generated"', () => {
    const eventAction: AiSummaryMetadataDoc['event.action'] = 'ai_summary_generated';
    expect(eventAction).toBe('ai_summary_generated');
    // @ts-expect-error event.action must be the literal 'ai_summary_generated'
    const badAction: AiSummaryMetadataDoc['event.action'] = 'relationship_observed';
    expect(badAction).toBe('relationship_observed');
  });

  it('rejects a document missing a required field at compile time', () => {
    const missingEntityId = {
      '@timestamp': '2026-06-01T10:00:00.000Z',
      'event.kind': 'event' as const,
      'event.action': 'ai_summary_generated' as const,
      'entity.type': 'user',
      'Ai_summary.generated_by': 'alice',
      'Ai_summary.generated_at': 1748771200000,
      'Ai_summary.highlights': [],
      'Ai_summary.staleness': { enabled_signals: [] as Array<'risk_score'>, snapshot: {} },
    };
    // @ts-expect-error entity.id is required
    const _bad: AiSummaryMetadataDoc = missingEntityId;
    expect(_bad).toBeDefined();
  });

  it('rejects a document missing Ai_summary.staleness at compile time', () => {
    const missingStaleness = {
      '@timestamp': '2026-06-01T10:00:00.000Z',
      'event.kind': 'event' as const,
      'event.action': 'ai_summary_generated' as const,
      'entity.id': 'user:alice@local',
      'entity.type': 'user',
      'Ai_summary.generated_by': 'alice',
      'Ai_summary.generated_at': 1748771200000,
      'Ai_summary.highlights': [],
    };
    // @ts-expect-error Ai_summary.staleness is required
    const _bad: AiSummaryMetadataDoc = missingStaleness;
    expect(_bad).toBeDefined();
  });
});

// Flat keyword/date paths the component template declares for AI summary docs.
const AI_SUMMARY_FLAT_TEMPLATE_PATHS = [
  'entity.type',
  'Ai_summary.generated_by',
  'Ai_summary.author_profile_uid',
  'Ai_summary.generated_at',
  'Ai_summary.recommended_actions',
  'Ai_summary.anomaly_job_ids',
  'Ai_summary.variant_id',
  'Ai_summary.staleness.enabled_signals',
  'Ai_summary.staleness.snapshot.risk_score',
] as const;

// True iff A and B are mutually assignable — used for exhaustiveness enforcement.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

// Every top-level key on AiSummaryMetadataDoc. Adding a field to the type
// without listing it here fails compilation.
const AI_SUMMARY_METADATA_FIELD_PATHS = [
  '@timestamp',
  'event.kind',
  'event.action',
  'event.ingested',
  'entity.id',
  'entity.type',
  'Ai_summary.generated_by',
  'Ai_summary.author_profile_uid',
  'Ai_summary.generated_at',
  'Ai_summary.highlights',
  'Ai_summary.recommended_actions',
  'Ai_summary.anomaly_job_ids',
  'Ai_summary.variant_id',
  'Ai_summary.staleness',
] as const satisfies ReadonlyArray<keyof AiSummaryMetadataDoc>;

type EnumeratedKeys = (typeof AI_SUMMARY_METADATA_FIELD_PATHS)[number];

describe('drift guard: AiSummaryMetadataDoc stays in sync with component template mapping', () => {
  const template = getMetadataComponentTemplate('default');
  const mappings = template.template?.mappings;
  const properties = (mappings?.properties ?? {}) as Record<string, { type?: string }>;

  it('AI_SUMMARY_METADATA_FIELD_PATHS exhaustively covers keyof AiSummaryMetadataDoc', () => {
    const exhaustive: Equals<EnumeratedKeys, keyof AiSummaryMetadataDoc> = true;
    expect(exhaustive).toBe(true);
  });

  it.each(AI_SUMMARY_FLAT_TEMPLATE_PATHS)('declares %s on the component template', (path) => {
    expect(properties[path]).toBeDefined();
  });

  it('declares Ai_summary.highlights as an object mapping', () => {
    expect(properties['Ai_summary.highlights']).toBeDefined();
    expect(properties['Ai_summary.highlights']?.type).toBe('object');
  });

  it('declares Ai_summary.generated_at as a date mapping', () => {
    expect(properties['Ai_summary.generated_at']).toBeDefined();
    expect(properties['Ai_summary.generated_at']?.type).toBe('date');
  });
});
