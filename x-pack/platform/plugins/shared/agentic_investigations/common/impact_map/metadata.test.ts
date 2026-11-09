/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveEntityMetadata } from './metadata';
import { mergeImpactMapCatalog } from './resolve_graph';

describe('resolveEntityMetadata', () => {
  it('labels known keys, lets the type and the entry override, and puts featured first', () => {
    const rows = resolveEntityMetadata(
      {
        metadata: [
          { key: 'service.version', value: '2.1.0' },
          { key: 'cloud.availability_zone', value: 'eu-west-1b' },
          { key: 'custom.thing', value: 'x' },
          { key: 'k8s.pod.name', value: 'p-1', featured: true, label: 'Pod it ran in' },
        ],
      },
      { metadata_fields: [{ key: 'custom.thing', label: 'Custom thing', featured: true }] }
    );
    expect(rows.map(({ key, label, featured }) => [key, label, featured])).toEqual([
      ['cloud.availability_zone', 'Availability zone', true],
      ['custom.thing', 'Custom thing', true],
      ['k8s.pod.name', 'Pod it ran in', true],
      ['service.version', 'Version', false],
    ]);
  });

  it('labels a key nobody named with itself', () => {
    expect(resolveEntityMetadata({ metadata: [{ key: 'a.b', value: '1' }] })).toEqual([
      { key: 'a.b', label: 'a.b', value: '1', featured: false },
    ]);
  });
});

describe('mergeImpactMapCatalog metadata fields', () => {
  it('adds fields up by key instead of replacing the list', () => {
    const merged = mergeImpactMapCatalog(
      {
        entity_types: [
          {
            id: 'pod',
            label: 'Pod',
            kind: 'infrastructure',
            metadata_fields: [{ key: 'k8s.node.name', label: 'Node' }],
          },
        ],
        relationship_types: [],
      },
      {
        entity_types: [
          {
            id: 'pod',
            label: 'Pod',
            kind: 'infrastructure',
            metadata_fields: [{ key: 'k8s.namespace.name', label: 'Namespace', featured: true }],
          },
        ],
      }
    );
    expect(merged.entity_types[0].metadata_fields?.map(({ key }) => key)).toEqual([
      'k8s.node.name',
      'k8s.namespace.name',
    ]);
  });
});
