/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  isImpactEntityLink,
  isKnowledgeIndicatorImpact,
  selectImpactEntities,
} from './impact_entities';

const impactAttachment = (
  entities: unknown,
  overrides: Partial<VersionedAttachment> = {}
): VersionedAttachment => ({
  id: 'impact-1',
  type: 'investigation_impact',
  current_version: 2,
  versions: [
    {
      version: 1,
      data: { entities: [{ id: 'stale', name: 'stale-host' }] },
      created_at: '2026-09-01T09:00:00.000Z',
      content_hash: 'v1',
    },
    {
      version: 2,
      data: { entities },
      created_at: '2026-09-01T10:00:00.000Z',
      content_hash: 'v2',
    },
  ],
  ...overrides,
});

describe('selectImpactEntities', () => {
  it('reads entities from the latest version and skips entries without an id', () => {
    expect(
      selectImpactEntities([
        impactAttachment([
          { id: 'host-1', name: 'web-01', type: 'host' },
          { name: 'missing-id' },
          { id: '' },
          { id: 'host-1', name: 'duplicate' },
          'not-an-entity',
        ]),
      ])
    ).toEqual([{ id: 'host-1', name: 'web-01', type: 'host' }]);
  });

  it('uses the newest impact attachment and ignores hidden, deleted, and other types', () => {
    const older = impactAttachment([{ id: 'old-host' }], {
      id: 'impact-old',
      versions: [
        {
          version: 1,
          data: { entities: [{ id: 'old-host' }] },
          created_at: '2026-09-01T08:00:00.000Z',
          content_hash: 'old',
        },
      ],
      current_version: 1,
    });
    const hidden = impactAttachment([{ id: 'hidden-host' }], { id: 'impact-hidden', hidden: true });
    const deleted = impactAttachment([{ id: 'deleted-host' }], {
      id: 'impact-deleted',
      active: false,
    });
    const entity = impactAttachment([{ id: 'entity-row' }], {
      id: 'entity-1',
      type: 'security.entity',
    });
    const newest = impactAttachment([{ id: 'host-2', type: 'user' }], { id: 'impact-new' });

    expect(selectImpactEntities([older, hidden, deleted, entity, newest])).toEqual([
      { id: 'host-2', type: 'user' },
    ]);
  });

  it('returns nothing when impact has no entities', () => {
    expect(selectImpactEntities(undefined)).toEqual([]);
    expect(selectImpactEntities([impactAttachment([])])).toEqual([]);
    expect(selectImpactEntities([impactAttachment({ id: 'not-a-list' })])).toEqual([]);
  });
});

describe('isKnowledgeIndicatorImpact', () => {
  const onOpen = jest.fn();

  it('treats a row with both a feature id and a stream name as a knowledge indicator', () => {
    const entity = { id: 'payments', featureId: 'feat', streamName: 'logs' };

    expect(isKnowledgeIndicatorImpact(entity)).toBe(true);
    expect(isImpactEntityLink(entity, onOpen)).toBe(false);
  });

  it('links an entity-store id when a handler is provided', () => {
    const entity = { id: 'host-1', name: 'web-01', type: 'host', featureId: 'feat' };

    expect(isKnowledgeIndicatorImpact(entity)).toBe(false);
    expect(isImpactEntityLink(entity, onOpen)).toBe(true);
    expect(isImpactEntityLink(entity)).toBe(false);
  });
});
