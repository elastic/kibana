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
  parseArtifactReferenceName,
  rebuildArtifactReferences,
} from './artifact_references';

const createRegistry = (): ArtifactTypeRegistry => {
  const registry = new ArtifactTypeRegistry();
  registry.register({
    type: 'dashboard',
    dataSchema: z.object({ dashboardId: z.string().max(256) }).strict(),
    references: [{ field: 'dashboardId', savedObjectType: 'dashboard' }],
  });
  registry.register({
    type: 'runbook',
    dataSchema: z.object({ content: z.string().max(1000) }).strict(),
  });
  return registry;
};

describe('buildArtifactReferenceName', () => {
  it('builds an artifact:<field>:<artifactId> name', () => {
    expect(buildArtifactReferenceName('dashboardId', 'a1')).toBe('artifact:dashboardId:a1');
  });

  it('keeps colons in the artifact id intact', () => {
    expect(buildArtifactReferenceName('dashboardId', 'a:1')).toBe('artifact:dashboardId:a:1');
  });
});

describe('parseArtifactReferenceName', () => {
  it('parses a well-formed name', () => {
    expect(parseArtifactReferenceName('artifact:dashboardId:a1')).toEqual({
      field: 'dashboardId',
      artifactId: 'a1',
    });
  });

  it('assigns everything after the second separator to the artifact id', () => {
    expect(parseArtifactReferenceName('artifact:dashboardId:a:1')).toEqual({
      field: 'dashboardId',
      artifactId: 'a:1',
    });
  });

  it('returns undefined for non-artifact references', () => {
    expect(parseArtifactReferenceName('other:ref')).toBeUndefined();
  });

  it('returns undefined when the field or artifact id is missing', () => {
    expect(parseArtifactReferenceName('artifact:')).toBeUndefined();
    expect(parseArtifactReferenceName('artifact::a1')).toBeUndefined();
    expect(parseArtifactReferenceName('artifact:dashboardId')).toBeUndefined();
    expect(parseArtifactReferenceName('artifact:dashboardId:')).toBeUndefined();
  });
});

describe('extractArtifactReferences', () => {
  it('extracts references for registered dashboard artifacts', () => {
    const refs = extractArtifactReferences(
      [{ id: 'a1', type: 'dashboard', data: { dashboardId: 'dash-1' } }],
      createRegistry()
    );

    expect(refs).toEqual([
      {
        name: 'artifact:dashboardId:a1',
        type: 'dashboard',
        id: 'dash-1',
      },
    ]);
  });

  it('extracts nothing for registered types without reference descriptors', () => {
    const refs = extractArtifactReferences(
      [{ id: 'rb-1', type: 'runbook', data: { content: '# Steps' } }],
      createRegistry()
    );

    expect(refs).toEqual([]);
  });

  it('extracts nothing for unregistered types', () => {
    const refs = extractArtifactReferences(
      [{ id: 'c1', type: 'obs.custom', data: { linkId: 'x' } }],
      createRegistry()
    );

    expect(refs).toEqual([]);
  });
});

describe('rebuildArtifactReferences', () => {
  it('rebuilds refs for registered artifacts and carries unregistered ones', () => {
    const previous: SavedObjectReference[] = [
      { name: 'other:ref', type: 'index-pattern', id: 'ip-1' },
      { name: 'artifact:dashboardId:legacy', type: 'dashboard', id: 'old-dash' },
      { name: 'artifact:linkId:custom-1', type: 'search', id: 'search-1' },
    ];

    const next = rebuildArtifactReferences({
      artifacts: [
        { id: 'a1', type: 'dashboard', data: { dashboardId: 'dash-2' } },
        { id: 'custom-1', type: 'obs.custom', data: { linkId: 'search-1' } },
      ],
      previousReferences: previous,
      registry: createRegistry(),
    });

    expect(next).toEqual(
      expect.arrayContaining([
        { name: 'other:ref', type: 'index-pattern', id: 'ip-1' },
        { name: 'artifact:dashboardId:a1', type: 'dashboard', id: 'dash-2' },
        { name: 'artifact:linkId:custom-1', type: 'search', id: 'search-1' },
      ])
    );
    expect(next.find((ref) => ref.name.includes('legacy'))).toBeUndefined();
  });
});

describe('injectArtifactReferences', () => {
  it('injects remapped reference ids into registered artifact data', () => {
    const artifacts = injectArtifactReferences(
      [{ id: 'a1', type: 'dashboard', data: { dashboardId: 'old-id' } }],
      [{ name: 'artifact:dashboardId:a1', type: 'dashboard', id: 'new-id' }],
      createRegistry()
    );

    expect(artifacts).toEqual([{ id: 'a1', type: 'dashboard', data: { dashboardId: 'new-id' } }]);
  });

  it('leaves unregistered artifacts untouched', () => {
    const artifacts = injectArtifactReferences(
      [{ id: 'c1', type: 'obs.custom', data: { linkId: 'x' } }],
      [{ name: 'artifact:linkId:c1', type: 'search', id: 'y' }],
      createRegistry()
    );

    expect(artifacts?.[0].data.linkId).toBe('x');
  });
});
