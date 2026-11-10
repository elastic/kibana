/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILT_IN_CATALOG } from './built_in_types';
import {
  impactMapEntitySchema,
  impactMapRelationshipSchema,
  type ImpactMapEntity,
  type ImpactMapRelationship,
} from './impact_map';
import { impactMapToMermaid, parseMermaid } from './mermaid';
import { resolveImpactMapGraph } from './resolve_graph';

/**
 * The map has to draw any system, not only the one it was first built for, and anything Mermaid
 * can draw. Each case is an architecture written the way a team would draw it, read into the
 * model and resolved against the built-in catalog the way a map is stored.
 */
const resolve = (mermaid: string) => {
  const parsed = parseMermaid(mermaid);
  const graph = resolveImpactMapGraph({
    entities: parsed.entities,
    relationships: parsed.relationships,
    catalog: BUILT_IN_CATALOG,
  });
  return { parsed, graph };
};

const typeOf = (entities: ImpactMapEntity[], id: string) =>
  entities.find((entity) => entity.id === id)?.type_id;

describe('architectures from other kinds of system', () => {
  it('a three-tier application on virtual machines behind a load balancer and a firewall', () => {
    const { parsed, graph } = resolve(`
      flowchart LR
        users((Customers)) --> fw{{Perimeter firewall}}
        fw --> lb[Load balancer]
        subgraph dmz [DMZ network]
          lb
          web1[Web server 1]
          web2[Web server 2]
        end
        subgraph app [Application subnet]
          api((Orders API))
        end
        subgraph data [Data subnet]
          db[(Orders MySQL)]
          nfs[/File share queue/]
        end
        lb --> web1 & web2
        web1 & web2 -->|HTTPS :8443| api
        api -- reads and writes --> db
        api -.-> nfs
    `);

    expect(graph.errors).toEqual([]);
    expect(typeOf(graph.entities, 'dmz')).toBe('network');
    expect(typeOf(graph.entities, 'db')).toBe('db.mysql');
    expect(typeOf(graph.entities, 'web1')).toBe('host');
    expect(graph.entities.find(({ id }) => id === 'web1')?.parent_id).toBe('dmz');
    expect(parsed.relationships.filter(({ target_id: target }) => target === 'api')).toHaveLength(
      2
    );
    expect(parsed.relationships.find(({ target_id: target }) => target === 'nfs')?.source).toBe(
      'inferred'
    );
  });

  it('microservices on Kubernetes with a managed database and a queue', () => {
    const { graph } = resolve(`
      architecture-beta
        group region(cloud)[Cloud region]
        group cluster(cloud)[Kubernetes cluster] in region
        service checkout(server)[Checkout service] in cluster
        service payments(server)[Payments service] in cluster
        service orders(database)[Managed orders database] in region
        service events(disk)[Event stream] in region
        checkout:R -- L:payments
        payments:B -- T:orders
        payments:R -- L:events
    `);

    expect(graph.errors).toEqual([]);
    expect(typeOf(graph.entities, 'region')).toBe('cloud.region');
    expect(typeOf(graph.entities, 'cluster')).toBe('k8s.cluster');
    expect(graph.entities.find(({ id }) => id === 'cluster')?.parent_id).toBe('region');
    expect(graph.entities.find(({ id }) => id === 'checkout')?.parent_id).toBe('cluster');
    expect(graph.relationships).toHaveLength(3);
  });

  it('an on-premises data centre where a firewall change cut a path', () => {
    const { graph } = resolve(`
      flowchart TB
        subgraph dc1 [Data center east]
          subgraph rack1 [Rack 1]
            hv1[Hypervisor 1]
          end
          fwRule[Firewall rule 4021]:::failing
        end
        erp[ERP application]:::failing
        erp ==> fwRule
        fwRule -. blocks .-> hv1
        classDef failing fill:#f00
    `);

    expect(graph.errors).toEqual([]);
    expect(typeOf(graph.entities, 'dc1')).toBe('data_center');
    expect(typeOf(graph.entities, 'fwRule')).toBe('network.firewall_rule');
    expect(graph.entities.find(({ id }) => id === 'hv1')?.parent_id).toBe('rack1');
    expect(graph.entities.find(({ id }) => id === 'fwRule')?.annotations).toMatchObject({
      health: 'critical',
    });
    expect(graph.relationships.find(({ source_id: source }) => source === 'erp')).toMatchObject({
      on_critical_path: true,
    });
  });
});

describe('Mermaid parity', () => {
  it.each([
    ['rectangle', 'a[Alpha] --> b[Beta]', 2, 1],
    ['quoted labels with punctuation', 'a["Alpha (primary): eu-west"] --> b["Beta & Co"]', 2, 1],
    ['line breaks in a label', 'a[Alpha<br/>primary] --> b[Beta]', 2, 1],
    ['an edge with text', 'a -- calls --> b', 2, 1],
    ['a pipe label', 'a -->|HTTPS| b', 2, 1],
    ['a chain', 'a --> b --> c --> d', 4, 3],
    ['several sources and targets', 'a & b --> c & d', 4, 4],
    ['both directions', 'a <--> b', 2, 2],
    ['no arrowhead', 'a --- b', 2, 1],
    ['thick and dotted edges', 'a ==> b -.-> c', 3, 2],
    ['a comment and a style line', '%% note\na --> b\nstyle a fill:#f9f', 2, 1],
    ['semicolon separated statements', 'a --> b; b --> c', 3, 2],
  ])('reads %s', (_name, body, entityCount, edgeCount) => {
    const { entities, relationships } = parseMermaid(`flowchart LR\n${body}`);
    expect(entities).toHaveLength(entityCount);
    expect(relationships).toHaveLength(edgeCount);
  });

  it('draws a link that ends at a subgraph', () => {
    const { entities, relationships } = parseMermaid(`
      flowchart LR
        client --> zone
        subgraph zone [Zone b]
          node1
        end
    `);
    expect(entities.find(({ id }) => id === 'zone')).toBeDefined();
    expect(relationships[0]).toMatchObject({ source_id: 'client', target_id: 'zone' });
  });

  it('accepts everything it writes, for a map with groups, severity and every edge style', () => {
    const entities: ImpactMapEntity[] = [
      { id: 'region', type_id: 'cloud.region', label: 'Region' },
      { id: 'zone', type_id: 'cloud.availability_zone', label: 'Zone b', parent_id: 'region' },
      {
        id: 'svc',
        type_id: 'service',
        label: 'Orders "API"',
        parent_id: 'zone',
        annotations: { impacted: true },
      },
      { id: 'db', type_id: 'db.postgresql', label: 'Orders DB', parent_id: 'zone' },
      { id: 'team', type_id: 'team', label: 'Payments team' },
      { id: 'weird id!', type_id: 'service', label: 'Odd' },
    ];
    const relationships: ImpactMapRelationship[] = [
      { type_id: 'calls', source_id: 'svc', target_id: 'db', on_critical_path: true },
      { type_id: 'owned_by', source_id: 'svc', target_id: 'team', source: 'inferred' },
      { type_id: 'calls', source_id: 'weird id!', target_id: 'svc', label: 'HTTPS :443' },
    ];
    entities.forEach((entity) => expect(impactMapEntitySchema.parse(entity)).toBeTruthy());
    relationships.forEach((rel) => expect(impactMapRelationshipSchema.parse(rel)).toBeTruthy());

    const text = impactMapToMermaid({
      entities,
      relationships,
      entityTypes: BUILT_IN_CATALOG.entity_types,
      relationshipTypes: BUILT_IN_CATALOG.relationship_types,
    });
    const back = parseMermaid(text);

    expect(back.warnings).toEqual([]);
    expect(back.entities).toHaveLength(entities.length);
    expect(back.relationships).toHaveLength(relationships.length);
    expect(back.entities.find(({ label }) => label === "Orders 'API'")?.parent_id).toBe('zone');
    expect(back.relationships.map(({ source: found }) => found)).toContain('inferred');
  });
});

describe('an availability zone loss, written as the map should show it', () => {
  it('is expressible and resolves without errors', () => {
    const entities: ImpactMapEntity[] = [
      { id: 'region', type_id: 'cloud.region', label: 'Region', source: 'config' },
      {
        id: 'zone-b',
        type_id: 'cloud.availability_zone',
        label: 'Zone b',
        parent_id: 'region',
        annotations: { role: 'root_cause', impacted: true },
        source: 'metric',
        confidence: 'high',
      },
      {
        id: 'allocators',
        type_id: 'host',
        label: 'Allocators (92 hosts)',
        parent_id: 'zone-b',
        annotations: { impacted: true },
      },
      {
        id: 'cluster',
        type_id: 'db.elasticsearch',
        label: 'Customer HA cluster',
        parent_id: 'region',
      },
      { id: 'controller', type_id: 'controller', label: 'Zone controller', parent_id: 'region' },
      { id: 'platform', type_id: 'team', label: 'Platform SRE', source: 'catalog' },
    ];
    const graph = resolveImpactMapGraph({
      entities,
      relationships: [
        {
          type_id: 'runs_on',
          source_id: 'cluster',
          target_id: 'allocators',
          on_critical_path: true,
        },
        { type_id: 'managed_by', source_id: 'allocators', target_id: 'controller' },
        {
          type_id: 'replicates_to',
          source_id: 'cluster',
          target_id: 'zone-b',
          source: 'inferred',
          confidence: 'low',
        },
        { type_id: 'owned_by', source_id: 'controller', target_id: 'platform' },
      ],
      catalog: BUILT_IN_CATALOG,
    });

    expect(graph.errors).toEqual([]);
    expect(graph.warnings).toEqual([]);
    expect(graph.newTypes).toEqual({ entity_types: [], relationship_types: [] });
  });
});
