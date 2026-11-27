/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CREATED_BY_RELATION,
  DERIVED_FROM_RELATION,
  type KiGraph,
  type KiGraphEdge,
  type KiGraphNodeData,
} from './types';
import { SPOTLIGHT_HUB_NEIGHBOR_LIMIT, getSpotlightModel } from './get_spotlight_model';

const node = (
  kiId: string,
  kind: KiGraphNodeData['kind'],
  title: string,
  occurrences?: number
): KiGraphNodeData => ({
  kiId,
  index: 'idx',
  kind,
  subtype: kind === 'workflow' || kind === 'crawler' ? '' : kind,
  title,
  ...(occurrences !== undefined ? { occurrences } : {}),
});

const edge = (
  id: string,
  source: string,
  target: string,
  relation: string
): KiGraph['edges'][number] => ({ id, source, target, relation });

describe('getSpotlightModel', () => {
  it('places outgoing derived_from and created_by on the Came from column', () => {
    const graph: KiGraph = {
      truncated: false,
      nodes: [
        node('fact-1', 'fact', 'Fact one'),
        node('memory-1', 'memory', 'Memory one'),
        node('wf-1', 'workflow', 'Workflow one'),
      ],
      edges: [
        edge('e1', 'fact-1', 'memory-1', DERIVED_FROM_RELATION),
        edge('e2', 'fact-1', 'wf-1', CREATED_BY_RELATION),
        edge('e3', 'fact-1', 'memory-1', 'references'),
      ],
    };

    const model = getSpotlightModel(graph, 'fact-1');
    expect(model).toBeDefined();
    expect(model?.cameFrom.map((g) => g.relation).sort()).toEqual(
      [CREATED_BY_RELATION, DERIVED_FROM_RELATION].sort()
    );
    expect(model?.cameFromCount).toBe(2);
    expect(model?.outgoing).toEqual([expect.objectContaining({ relation: 'references' })]);
  });

  it('places inbound derived_from on Came from for non-hub nodes', () => {
    const graph: KiGraph = {
      truncated: false,
      nodes: [node('fact-1', 'fact', 'Fact'), node('memory-1', 'memory', 'Memory')],
      edges: [edge('e1', 'fact-1', 'memory-1', DERIVED_FROM_RELATION)],
    };

    const model = getSpotlightModel(graph, 'fact-1');
    expect(model?.cameFrom).toHaveLength(1);
    expect(model?.cameFrom[0]?.neighbors[0]?.node.kiId).toBe('memory-1');
  });

  it('shows what a workflow hub produced on the right column', () => {
    const graph: KiGraph = {
      truncated: false,
      nodes: [
        node('wf-1', 'workflow', 'Workflow'),
        node('fact-1', 'fact', 'Fact A'),
        node('fact-2', 'fact', 'Fact B'),
      ],
      edges: [
        edge('e1', 'fact-1', 'wf-1', CREATED_BY_RELATION),
        edge('e2', 'fact-2', 'wf-1', CREATED_BY_RELATION),
      ],
    };

    const model = getSpotlightModel(graph, 'wf-1');
    expect(model?.cameFrom).toHaveLength(0);
    expect(model?.outgoing).toHaveLength(1);
    expect(model?.outgoing[0]?.count).toBe(2);
    expect(model?.outgoing[0]?.neighbors.map((n) => n.node.kiId).sort()).toEqual([
      'fact-1',
      'fact-2',
    ]);
  });

  it('caps hub neighbor lists and sets moreCount', () => {
    const total = SPOTLIGHT_HUB_NEIGHBOR_LIMIT + 5;
    const nodes: KiGraphNodeData[] = [node('wf-1', 'workflow', 'Workflow')];
    const edges: KiGraphEdge[] = [];

    for (let i = 0; i < total; i++) {
      const factId = `fact-${i}`;
      nodes.push(node(factId, 'fact', `Fact ${i}`, i));
      edges.push(edge(`e${i}`, factId, 'wf-1', CREATED_BY_RELATION));
    }

    const graph: KiGraph = { truncated: false, nodes, edges };
    const model = getSpotlightModel(graph, 'wf-1');

    expect(model?.outgoing).toHaveLength(1);
    const group = model?.outgoing[0];
    expect(group?.count).toBe(total);
    expect(group?.neighbors).toHaveLength(SPOTLIGHT_HUB_NEIGHBOR_LIMIT);
    expect(group?.moreCount).toBe(5);
  });
});
