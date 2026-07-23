/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFeature } from './feature';
import { computeFeatureUuid, mergeFeature, normalizeFeatureSlugForMatching } from './feature';
import { MAX_ID_LENGTH } from './significant_events/constants';

const createFeature = ({
  id = 'okta',
  version,
  meta,
}: {
  id?: string;
  version?: string;
  meta?: Record<string, unknown>;
} = {}): BaseFeature => ({
  id,
  stream_name: 'logs.test',
  type: 'technology',
  subtype: 'identity_provider',
  title: 'Okta',
  description: 'Okta identity provider',
  properties: {
    name: 'okta',
    ...(version === undefined ? {} : { version }),
  },
  confidence: 90,
  evidence: [],
  evidence_doc_ids: [],
  tags: ['identity'],
  meta,
});

describe('normalizeFeatureSlugForMatching', () => {
  it.each([
    ['okta-3.15.0', 'okta'],
    ['ubuntu-20.04.6', 'ubuntu'],
    ['ecs-8.0.0', 'ecs'],
    ['wolfi-20230201', 'wolfi'],
    ['agentless-api-image-b0df6c5e9fc0', 'agentless-api-image'],
    ['collector-1.2.3-deadbeef', 'collector'],
    ['api-user-http', 'api-user-http'],
    ['mutual-tls', 'mutual-tls'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeFeatureSlugForMatching(input)).toBe(expected);
  });

  it('does not strip short numeric suffixes (ds-1 vs ds-2 are distinct infrastructure)', () => {
    expect(normalizeFeatureSlugForMatching('production-noncanary-ds-1')).toBe(
      'production-noncanary-ds-1'
    );
    expect(normalizeFeatureSlugForMatching('production-noncanary-ds-2')).toBe(
      'production-noncanary-ds-2'
    );
  });

  it('returns the normalized slug when stripping would empty it', () => {
    expect(normalizeFeatureSlugForMatching('  -1.2.3  ')).toBe('-1.2.3');
  });

  it('skips suffix matching for ids above the schema limit', () => {
    const oversizedId = `-0${'.0'.repeat(MAX_ID_LENGTH)}`;

    expect(normalizeFeatureSlugForMatching(oversizedId)).toBe(oversizedId);
  });

  it('keeps matching normalization out of UUID generation', () => {
    const canonical = { id: 'okta', stream_name: 'logs.test' };
    const versioned = { id: 'okta-3.15.0', stream_name: 'logs.test' };

    expect(normalizeFeatureSlugForMatching(versioned.id)).toBe(canonical.id);
    expect(computeFeatureUuid(versioned)).not.toBe(computeFeatureUuid(canonical));
  });
});

describe('mergeFeature version history', () => {
  it('records the superseded version when the incoming version changes', () => {
    const merged = mergeFeature(
      createFeature({ version: '3.14.1', meta: { source: 'existing' } }),
      createFeature({ version: '3.15.0', meta: { observed: true } })
    );

    expect(merged.properties.version).toBe('3.15.0');
    expect(merged.meta).toEqual({
      source: 'existing',
      observed: true,
      version_history: ['3.14.1'],
    });
  });

  it('does not duplicate an existing version or add history for an unchanged version', () => {
    const changed = mergeFeature(
      createFeature({
        version: '3.14.1',
        meta: { version_history: ['3.13.0', '3.14.1'] },
      }),
      createFeature({ version: '3.15.0' })
    );
    const unchanged = mergeFeature(
      createFeature({ version: '3.14.1', meta: { version_history: ['3.13.0'] } }),
      createFeature({ version: '3.14.1' })
    );

    expect(changed.meta?.version_history).toEqual(['3.13.0', '3.14.1']);
    expect(unchanged.meta?.version_history).toEqual(['3.13.0']);
  });

  it('ignores malformed history entries and caps history at ten versions', () => {
    const versionHistory = Array.from({ length: 10 }, (_, index) => `3.${index}.0`);
    const merged = mergeFeature(
      createFeature({
        version: '3.10.0',
        meta: { version_history: [...versionHistory, 42, null] },
      }),
      createFeature({ version: '3.11.0' })
    );

    expect(merged.meta?.version_history).toEqual([
      '3.1.0',
      '3.2.0',
      '3.3.0',
      '3.4.0',
      '3.5.0',
      '3.6.0',
      '3.7.0',
      '3.8.0',
      '3.9.0',
      '3.10.0',
    ]);
  });

  it('does not create history without two non-empty string versions', () => {
    const missingIncoming = mergeFeature(createFeature({ version: '3.14.1' }), createFeature());
    const emptyExisting = mergeFeature(
      createFeature({ version: ' ' }),
      createFeature({ version: '3.15.0' })
    );

    expect(missingIncoming.meta).toBeUndefined();
    expect(emptyExisting.meta).toBeUndefined();
  });

  it('preserves existing aliases and safely merges newly captured aliases', () => {
    const merged = mergeFeature(
      createFeature({ meta: { aliases: ['old-alias', 'shared-alias'] } }),
      createFeature({ meta: { aliases: ['shared-alias', 'new-alias', 42] } })
    );

    expect(merged.meta?.aliases).toEqual(['old-alias', 'shared-alias', 'new-alias']);
  });

  it('does not trust incoming version history', () => {
    const merged = mergeFeature(
      createFeature({ version: '3.14.1', meta: { version_history: ['3.13.0'] } }),
      createFeature({
        version: '3.14.1',
        meta: { version_history: ['model-supplied-version'] },
      })
    );

    expect(merged.meta?.version_history).toEqual(['3.13.0']);
  });
});
