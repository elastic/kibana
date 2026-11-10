/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactMapCatalog } from './impact_map';
import { mergeImpactMapCatalog, resolveImpactMapGraph } from './resolve_graph';

const catalog: ImpactMapCatalog = {
  entity_types: [
    { id: 'service', label: 'Service', kind: 'service', icon: { agent_name: 'nodejs' } },
    { id: 'database', label: 'Database', kind: 'dependency', icon: { span_type: 'db' } },
    { id: 'queue', label: 'Queue', kind: 'dependency' },
  ],
  relationship_types: [
    { id: 'calls', label: 'CALLS' },
    { id: 'publishes_to', label: 'PUBLISHES_TO' },
  ],
};

describe('resolveImpactMapGraph', () => {
  it('keeps only the types the graph uses and ids every relationship', () => {
    const graph = resolveImpactMapGraph({
      entities: [
        { id: 'checkout', type_id: 'service', label: 'checkout' },
        { id: 'payments-db', type_id: 'database', label: 'payments-db' },
      ],
      relationships: [{ type_id: 'calls', source_id: 'checkout', target_id: 'payments-db' }],
      catalog,
    });

    expect(graph.errors).toEqual([]);
    expect(graph.warnings).toEqual([]);
    expect(graph.entityTypes.map(({ id }) => id)).toEqual(['service', 'database']);
    expect(graph.relationshipTypes.map(({ id }) => id)).toEqual(['calls']);
    expect(graph.relationships[0].id).toBe('checkout->payments-db:calls');
    expect(graph.newTypes).toEqual({ entity_types: [], relationship_types: [] });
  });

  it('prefers inline types over the catalog and reports the new ones', () => {
    const graph = resolveImpactMapGraph({
      entities: [
        { id: 'checkout', type_id: 'service', label: 'checkout' },
        { id: 'pod-1', type_id: 'k8s.pod', label: 'pod-1' },
      ],
      relationships: [{ type_id: 'runs_on', source_id: 'checkout', target_id: 'pod-1' }],
      catalog,
      entityTypes: [
        { id: 'service', label: 'Microservice', kind: 'service', icon: { agent_name: 'go' } },
        { id: 'k8s.pod', label: 'Kubernetes pod', kind: 'service' },
      ],
      relationshipTypes: [{ id: 'runs_on', label: 'RUNS_ON' }],
    });

    expect(graph.entityTypes).toEqual([
      { id: 'service', label: 'Microservice', kind: 'service', icon: { agent_name: 'go' } },
      // A Kubernetes object sent as a service is infrastructure.
      { id: 'k8s.pod', label: 'Kubernetes pod', kind: 'infrastructure' },
    ]);
    expect(graph.newTypes).toEqual({
      entity_types: [{ id: 'k8s.pod', label: 'Kubernetes pod', kind: 'infrastructure' }],
      relationship_types: [{ id: 'runs_on', label: 'RUNS_ON' }],
    });
  });

  it('makes up a type nobody defined, and warns', () => {
    const graph = resolveImpactMapGraph({
      entities: [
        { id: 'a', type_id: 'edge_function', label: 'a' },
        { id: 'b', type_id: 'service', label: 'b' },
      ],
      relationships: [{ type_id: 'invokes', source_id: 'a', target_id: 'b' }],
      catalog,
    });

    expect(graph.errors).toEqual([]);
    expect(graph.newTypes).toEqual({
      entity_types: [{ id: 'edge_function', label: 'Edge Function', kind: 'service' }],
      relationship_types: [{ id: 'invokes', label: 'INVOKES' }],
    });
    expect(graph.warnings).toHaveLength(2);
  });

  it('rejects duplicate entity ids and edges to entities that do not exist', () => {
    const graph = resolveImpactMapGraph({
      entities: [
        { id: 'a', type_id: 'service', label: 'a' },
        { id: 'a', type_id: 'service', label: 'a again' },
      ],
      relationships: [{ type_id: 'calls', source_id: 'a', target_id: 'ghost' }],
      catalog,
    });

    expect(graph.errors).toEqual([
      'Entity id "a" is used more than once.',
      'Relationship "a->ghost:calls" points at "ghost", which is not an entity.',
    ]);
    expect(graph.relationships).toEqual([]);
  });

  it('keeps the first of two relationships with the same id', () => {
    const graph = resolveImpactMapGraph({
      entities: [
        { id: 'a', type_id: 'service', label: 'a' },
        { id: 'b', type_id: 'service', label: 'b' },
      ],
      relationships: [
        { type_id: 'calls', source_id: 'a', target_id: 'b', on_critical_path: true },
        { type_id: 'calls', source_id: 'a', target_id: 'b' },
      ],
      catalog,
    });

    expect(graph.relationships).toEqual([
      {
        id: 'a->b:calls',
        type_id: 'calls',
        source_id: 'a',
        target_id: 'b',
        on_critical_path: true,
      },
    ]);
    expect(graph.warnings).toHaveLength(1);
  });
});

describe('mergeImpactMapCatalog', () => {
  it('updates types by id, keeps the icon the update left out, appends new ones, and keeps the order', () => {
    expect(
      mergeImpactMapCatalog(catalog, {
        entity_types: [
          { id: 'database', label: 'SQL database', kind: 'dependency' },
          { id: 'cache', label: 'Cache', kind: 'dependency' },
        ],
      })
    ).toEqual({
      entity_types: [
        catalog.entity_types[0],
        { ...catalog.entity_types[1], label: 'SQL database' },
        catalog.entity_types[2],
        { id: 'cache', label: 'Cache', kind: 'dependency' },
      ],
      relationship_types: catalog.relationship_types,
    });
  });
});

describe('resolveImpactMapGraph parents', () => {
  const entity = (id: string, parent_id?: string) => ({
    id,
    type_id: 'service',
    label: id,
    ...(parent_id ? { parent_id } : {}),
  });

  it('keeps a parent that is in the map, however deep', () => {
    const graph = resolveImpactMapGraph({
      entities: [entity('region'), entity('zone', 'region'), entity('node', 'zone')],
      relationships: [],
      catalog,
    });

    expect(graph.warnings).toEqual([]);
    expect(graph.entities.map(({ parent_id: parent }) => parent)).toEqual([
      undefined,
      'region',
      'zone',
    ]);
  });

  it('drops a parent that is missing, is the entity itself, or closes a loop, and keeps the entity', () => {
    const graph = resolveImpactMapGraph({
      entities: [entity('a', 'ghost'), entity('b', 'b'), entity('c', 'd'), entity('d', 'c')],
      relationships: [],
      catalog,
    });

    expect(graph.entities).toHaveLength(4);
    expect(graph.warnings).toHaveLength(3);
    // The loop is cut once: one of the pair keeps its parent, so the other is inside it.
    const parents = graph.entities.filter(({ parent_id: parent }) => parent);
    expect(parents).toHaveLength(1);
  });
});
