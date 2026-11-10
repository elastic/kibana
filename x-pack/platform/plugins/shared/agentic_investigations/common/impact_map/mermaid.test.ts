/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { impactMapToMermaid, parseMermaid } from './mermaid';

const byId = <T extends { id: string }>(entities: T[], id: string): T | undefined =>
  entities.find((e) => e.id === id);

describe('parseMermaid', () => {
  it('reads shapes, labelled edges, chains and groups of a flowchart', () => {
    const { entities, relationships } = parseMermaid(`
      flowchart LR
        web((Checkout web)) -->|HTTPS| api[Payments API]
        api -- reads --> pg[(Postgres orders)]
        api ==> q[/Order queue/]
        a1 & a2 --> api
    `);
    expect(byId(entities, 'web')).toMatchObject({ type_id: 'service', label: 'Checkout web' });
    expect(byId(entities, 'pg')).toMatchObject({ type_id: 'db.postgresql' });
    expect(byId(entities, 'q')).toMatchObject({ type_id: 'messaging.queue' });
    expect(relationships).toContainEqual(
      expect.objectContaining({
        source_id: 'web',
        target_id: 'api',
        label: 'HTTPS',
        type_id: 'calls',
      })
    );
    expect(relationships).toContainEqual(
      expect.objectContaining({ source_id: 'api', target_id: 'pg', type_id: 'reads_from' })
    );
    expect(relationships).toContainEqual(
      expect.objectContaining({ source_id: 'api', target_id: 'q', on_critical_path: true })
    );
    expect(relationships.filter(({ target_id: target }) => target === 'api')).toHaveLength(3);
  });

  it('turns nested subgraphs into parents and guesses their type from the title', () => {
    const { entities } = parseMermaid(`
      graph TD
        subgraph r1 [Region eu-west2]
          subgraph z1 [Zone b]
            alloc[Allocator]
          end
        end
    `);
    expect(byId(entities, 'r1')).toMatchObject({ type_id: 'cloud.region' });
    expect(byId(entities, 'z1')).toMatchObject({
      type_id: 'cloud.availability_zone',
      parent_id: 'r1',
    });
    expect(byId(entities, 'alloc')).toMatchObject({ parent_id: 'z1' });
  });

  it('reads classes and colours as severity and dotted edges as inferred', () => {
    const { entities, relationships } = parseMermaid(`
      flowchart LR
        a[A]:::failing -.-> b[B]
        classDef failing fill:#f00,stroke:#900
        classDef fine fill:#0a0
        class b fine
    `);
    expect(byId(entities, 'a')?.annotations).toMatchObject({ health: 'critical', impacted: true });
    expect(byId(entities, 'b')?.annotations).toMatchObject({ health: 'healthy' });
    expect(relationships[0]).toMatchObject({ source: 'inferred', confidence: 'low' });
  });

  it('reads an architecture-beta diagram and a sequence diagram', () => {
    const architecture = parseMermaid(`
      architecture-beta
        group api(cloud)[API]
        service db(database)[Database] in api
        service server(server)[Server] in api
        db:L -- R:server
    `);
    expect(byId(architecture.entities, 'db')).toMatchObject({
      type_id: 'database',
      parent_id: 'api',
    });
    expect(architecture.relationships).toHaveLength(1);

    const sequence = parseMermaid(`
      sequenceDiagram
        participant W as Web
        W->>A: GET /orders
        A->>D: SELECT orders
    `);
    expect(sequence.entities.map(({ id }) => id).sort()).toEqual(['A', 'D', 'W']);
    expect(sequence.relationships).toHaveLength(2);
  });

  it('says so when it cannot read a diagram', () => {
    expect(parseMermaid('pie title Pets\n "Dogs": 3')).toMatchObject({
      diagram: 'unsupported',
      entities: [],
    });
  });
});

describe('impactMapToMermaid', () => {
  it('writes a map that reads back as the same entities, groups and links', () => {
    const entities = [
      { id: 'zone-b', type_id: 'cloud.availability_zone', label: 'Zone b' },
      {
        id: 'allocator',
        type_id: 'service',
        label: 'Allocator',
        parent_id: 'zone-b',
        annotations: { role: 'root_cause' as const },
      },
      { id: 'es', type_id: 'db.elasticsearch', label: 'Customer cluster', parent_id: 'zone-b' },
    ];
    const text = impactMapToMermaid({
      entities,
      relationships: [
        { type_id: 'writes_to', source_id: 'allocator', target_id: 'es', on_critical_path: true },
      ],
      entityTypes: [
        { id: 'service', label: 'Service', kind: 'service' },
        { id: 'db.elasticsearch', label: 'Elasticsearch', kind: 'infrastructure' },
      ],
      relationshipTypes: [{ id: 'writes_to', label: 'WRITES_TO' }],
    });
    expect(text).toContain('subgraph');
    expect(text).toContain('==>');
    const back = parseMermaid(text);
    expect(back.entities.map(({ type_id: type }) => type).sort()).toEqual(
      ['cloud.availability_zone', 'db.elasticsearch', 'service'].sort()
    );
    expect(byId(back.entities, 'allocator')).toMatchObject({ parent_id: 'n0' });
    expect(byId(back.entities, 'allocator')?.annotations?.role).toBe('root_cause');
    expect(back.relationships[0]).toMatchObject({ on_critical_path: true });
  });
});
