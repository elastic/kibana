/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { SavedObjectReference } from '@kbn/core/server';
import { ArtifactTypeRegistry } from './artifact_type_registry';
import {
  buildArtifactReferenceName,
  extractArtifactReferences,
  injectArtifactReferences,
  rebuildArtifactReferences,
} from './artifact_references';

describe('artifact references helpers', () => {
  let registry: ArtifactTypeRegistry;

  beforeEach(() => {
    registry = new ArtifactTypeRegistry();
    registry.register({
      type: 'dashboard',
      dataSchema: z.object({ dashboardId: z.string().max(256) }).strict(),
      references: [{ field: 'dashboardId', savedObjectType: 'dashboard' }],
    });
    registry.register({
      type: 'runbook',
      dataSchema: z.object({ content: z.string().max(1000) }).strict(),
    });
  });

  it('extracts references for registered dashboard artifacts', () => {
    const refs = extractArtifactReferences(
      [{ id: 'a1', type: 'dashboard', data: { dashboardId: 'dash-1' } }],
      registry
    );

    expect(refs).toEqual([
      {
        name: buildArtifactReferenceName('dashboardId', 'a1'),
        type: 'dashboard',
        id: 'dash-1',
      },
    ]);
  });

  it('rebuilds refs for registered artifacts and carries unregistered ones', () => {
    const previous: SavedObjectReference[] = [
      { name: 'other:ref', type: 'index-pattern', id: 'ip-1' },
      {
        name: buildArtifactReferenceName('dashboardId', 'legacy'),
        type: 'dashboard',
        id: 'old-dash',
      },
      {
        name: buildArtifactReferenceName('linkId', 'custom-1'),
        type: 'search',
        id: 'search-1',
      },
    ];

    const next = rebuildArtifactReferences({
      artifacts: [
        { id: 'a1', type: 'dashboard', data: { dashboardId: 'dash-2' } },
        { id: 'custom-1', type: 'obs.custom', data: { linkId: 'search-1' } },
      ],
      previousReferences: previous,
      registry,
    });

    expect(next).toEqual(
      expect.arrayContaining([
        { name: 'other:ref', type: 'index-pattern', id: 'ip-1' },
        {
          name: buildArtifactReferenceName('dashboardId', 'a1'),
          type: 'dashboard',
          id: 'dash-2',
        },
        {
          name: buildArtifactReferenceName('linkId', 'custom-1'),
          type: 'search',
          id: 'search-1',
        },
      ])
    );
    expect(next.find((ref) => ref.name.includes('legacy'))).toBeUndefined();
  });

  it('injects remapped reference ids into registered artifact data', () => {
    const artifacts = injectArtifactReferences(
      [{ id: 'a1', type: 'dashboard', data: { dashboardId: 'old-id' } }],
      [
        {
          name: buildArtifactReferenceName('dashboardId', 'a1'),
          type: 'dashboard',
          id: 'new-id',
        },
      ],
      registry
    );

    expect(artifacts).toEqual([{ id: 'a1', type: 'dashboard', data: { dashboardId: 'new-id' } }]);
  });

  it('leaves unregistered artifacts untouched on inject', () => {
    const artifacts = injectArtifactReferences(
      [{ id: 'c1', type: 'obs.custom', data: { linkId: 'x' } }],
      [{ name: buildArtifactReferenceName('linkId', 'c1'), type: 'search', id: 'y' }],
      registry
    );

    expect(artifacts?.[0].data.linkId).toBe('x');
  });
});
