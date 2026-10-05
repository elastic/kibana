/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseMermaidFlowchart } from '../../../common/component_diagram/parse_mermaid_flowchart';
import { layoutComponentDiagram } from './layout_component_diagram';

const chart = (source: string) => {
  const parsed = parseMermaidFlowchart(source);
  if (!parsed) throw new Error('not a flowchart');
  return parsed;
};

describe('layoutComponentDiagram', () => {
  it('lays a left to right chart out in ranks from left to right', () => {
    const layout = layoutComponentDiagram(chart('flowchart LR\na-->b-->c'), []);

    expect(layout.horizontal).toBe(true);
    const [a, b, c] = layout.nodes;
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
  });

  it('lays a top down chart out from top to bottom', () => {
    const layout = layoutComponentDiagram(chart('flowchart TD\na-->b'), []);

    expect(layout.horizontal).toBe(false);
    expect(layout.nodes[0].y).toBeLessThan(layout.nodes[1].y);
  });

  it('marks problem nodes, by id or by the problem class, and the edges touching them', () => {
    const layout = layoutComponentDiagram(chart('flowchart LR\na-->b\nb-->c:::problem\nd-->e'), [
      'b',
    ]);

    expect(layout.nodes.filter(({ isProblem }) => isProblem).map(({ node }) => node.id)).toEqual([
      'b',
      'c',
    ]);
    expect(layout.edges.map(({ touchesProblem }) => touchesProblem)).toEqual([true, true, false]);
  });

  it('makes long labels taller rather than wider than the maximum', () => {
    const layout = layoutComponentDiagram(
      chart(`flowchart LR\na[short]\nb[${'a very long component label '.repeat(4)}]`),
      []
    );

    const [short, long] = layout.nodes;
    expect(long.width).toBe(220);
    expect(long.height).toBeGreaterThan(short.height);
  });
});
