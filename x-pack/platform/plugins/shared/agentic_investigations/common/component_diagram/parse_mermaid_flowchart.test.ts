/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseMermaidFlowchart } from './parse_mermaid_flowchart';

describe('parseMermaidFlowchart', () => {
  it('returns undefined for something that is not a flowchart', () => {
    expect(parseMermaidFlowchart('sequenceDiagram\n  A->>B: hi')).toBeUndefined();
    expect(parseMermaidFlowchart('')).toBeUndefined();
  });

  it('reads the direction, node shapes, and labels', () => {
    const chart = parseMermaidFlowchart(`flowchart LR
      user([User]) --> fe[Frontend]
      fe --> api{{"API gateway"}}
      api --> db[(Postgres)]
      api --> cache((Redis))
      api --> check{Healthy?}`);

    expect(chart?.direction).toBe('LR');
    expect(chart?.nodes.map(({ id, label, shape }) => [id, label, shape])).toEqual([
      ['user', 'User', 'stadium'],
      ['fe', 'Frontend', 'rectangle'],
      ['api', 'API gateway', 'hexagon'],
      ['db', 'Postgres', 'database'],
      ['cache', 'Redis', 'circle'],
      ['check', 'Healthy?', 'diamond'],
    ]);
    expect(chart?.skipped).toEqual([]);
  });

  it('defaults to top to bottom and treats TD as TB', () => {
    expect(parseMermaidFlowchart('graph\nA-->B')?.direction).toBe('TB');
    expect(parseMermaidFlowchart('graph TD\nA-->B')?.direction).toBe('TB');
  });

  it('reads edge labels, styles, chains, and & lists', () => {
    const chart = parseMermaidFlowchart(`flowchart TB
      a-->|calls|b
      b -- "reads from" --> c
      c -.-> d
      d ==> e
      e --- f
      g <--> h
      i & j --> k --> l`);

    expect(chart?.edges).toEqual([
      { source: 'a', target: 'b', label: 'calls', dotted: false, thick: false, arrow: 'forward' },
      {
        source: 'b',
        target: 'c',
        label: 'reads from',
        dotted: false,
        thick: false,
        arrow: 'forward',
      },
      { source: 'c', target: 'd', dotted: true, thick: false, arrow: 'forward' },
      { source: 'd', target: 'e', dotted: false, thick: true, arrow: 'forward' },
      { source: 'e', target: 'f', dotted: false, thick: false, arrow: 'none' },
      { source: 'g', target: 'h', dotted: false, thick: false, arrow: 'both' },
      { source: 'i', target: 'k', dotted: false, thick: false, arrow: 'forward' },
      { source: 'j', target: 'k', dotted: false, thick: false, arrow: 'forward' },
      { source: 'k', target: 'l', dotted: false, thick: false, arrow: 'forward' },
    ]);
  });

  it('keeps dashes inside ids apart from arrows', () => {
    const chart = parseMermaidFlowchart('flowchart LR\napi-gateway-->order-db\nweb-1-.->web-2');

    expect(chart?.edges.map(({ source, target }) => [source, target])).toEqual([
      ['api-gateway', 'order-db'],
      ['web-1', 'web-2'],
    ]);
  });

  it('reads classes, subgraphs, semicolons, and comments, and skips styling', () => {
    const chart = parseMermaidFlowchart(`flowchart LR
      %% the checkout path
      subgraph cluster[Production cluster]
        api[API]:::problem
        worker[Worker]
      end
      api --> worker; worker --> queue
      class queue,worker slow
      classDef problem fill:#f00
      style api stroke:#f00`);

    expect(chart?.nodes).toEqual([
      {
        id: 'api',
        label: 'API',
        shape: 'rectangle',
        classes: ['problem'],
        group: 'Production cluster',
      },
      {
        id: 'worker',
        label: 'Worker',
        shape: 'rectangle',
        classes: ['slow'],
        group: 'Production cluster',
      },
      { id: 'queue', label: 'queue', shape: 'rectangle', classes: ['slow'] },
    ]);
    expect(chart?.skipped).toEqual([]);
  });

  it('turns <br> into line breaks and strips code fences', () => {
    const chart = parseMermaidFlowchart('```mermaid\nflowchart LR\nA["checkout<br/>v2.3.1"]\n```');

    expect(chart?.nodes[0].label).toBe('checkout\nv2.3.1');
  });

  it('lists statements it cannot read instead of failing', () => {
    const chart = parseMermaidFlowchart('flowchart LR\nA --> B\nA --> [broken');

    expect(chart?.edges).toHaveLength(1);
    expect(chart?.skipped).toEqual(['A --> [broken']);
  });
});
