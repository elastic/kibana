/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiGraph, KiGraphNodeData } from './types';
import {
  areAllKiGraphNodesHidden,
  buildKiGraphConnectedNodeIds,
  buildKiGraphLegendFilterEntries,
  createDefaultKiGraphFilterState,
  getKiGraphFilterKey,
  getVisibleKiGraph,
  isKiGraphEdgeHidden,
  isKiGraphFilterKeyVisible,
  isKiGraphNodeHidden,
  shouldClearKiGraphSelection,
  toggleKiGraphFilterKeyVisibility,
} from './ki_graph_filter';

const graphNode = (
  kiId: string,
  kind: KiGraphNodeData['kind'],
  subtype: string
): KiGraphNodeData => ({
  kiId,
  index: 'idx',
  kind,
  subtype,
  title: kiId,
});

const sampleGraph: KiGraph = {
  truncated: false,
  nodes: [
    graphNode('e1', 'entity', 'person'),
    graphNode('e2', 'entity', 'person'),
    graphNode('e3', 'entity', 'place'),
    graphNode('f1', 'fact', 'preference'),
    graphNode('m1', 'memory', 'session'),
    graphNode('w1', 'workflow', ''),
  ],
  edges: [
    { id: 'x1', source: 'f1', target: 'e1', relation: 'relates_to' },
    { id: 'x2', source: 'f1', target: 'm1', relation: 'derived_from' },
    { id: 'x3', source: 'f1', target: 'w1', relation: 'created_by' },
    { id: 'x4', source: 'e1', target: 'e3', relation: 'relates_to' },
  ],
};

const kindOnlyFilter = { hiddenKeys: new Set<string>(), hideUnconnected: false };

describe('getKiGraphFilterKey', () => {
  it('uses kind-only keys for workflow and memory without subtype', () => {
    expect(getKiGraphFilterKey('workflow', '')).toBe('workflow');
    expect(getKiGraphFilterKey('memory', '')).toBe('memory');
  });

  it('uses kind:subtype for other combinations', () => {
    expect(getKiGraphFilterKey('entity', 'person')).toBe('entity:person');
    expect(getKiGraphFilterKey('memory', 'session')).toBe('memory:session');
  });
});

describe('buildKiGraphLegendFilterEntries', () => {
  it('counts nodes per filter key and sorts by kind then subtype', () => {
    const entries = buildKiGraphLegendFilterEntries(sampleGraph);
    expect(entries).toEqual([
      { key: 'entity:person', kind: 'entity', subtype: 'person', count: 2 },
      { key: 'entity:place', kind: 'entity', subtype: 'place', count: 1 },
      { key: 'fact:preference', kind: 'fact', subtype: 'preference', count: 1 },
      { key: 'memory:session', kind: 'memory', subtype: 'session', count: 1 },
      { key: 'workflow', kind: 'workflow', subtype: '', count: 1 },
    ]);
  });
});

describe('visibility helpers', () => {
  const connectedNodeIds = buildKiGraphConnectedNodeIds(sampleGraph);

  it('hides nodes when kind or subtype key is in the hidden set', () => {
    const bySubtype = { hiddenKeys: new Set(['entity:person']), hideUnconnected: false };
    expect(
      isKiGraphNodeHidden(graphNode('e1', 'entity', 'person'), bySubtype, connectedNodeIds)
    ).toBe(true);
    expect(
      isKiGraphNodeHidden(graphNode('e3', 'entity', 'place'), bySubtype, connectedNodeIds)
    ).toBe(false);

    const byKind = { hiddenKeys: new Set(['entity']), hideUnconnected: false };
    expect(isKiGraphNodeHidden(graphNode('e3', 'entity', 'place'), byKind, connectedNodeIds)).toBe(
      true
    );
  });

  it('toggles visibility and clears a kind-level hide when showing a row', () => {
    const hidden = new Set(['entity']);
    expect(isKiGraphFilterKeyVisible('entity:person', 'entity', hidden)).toBe(false);

    const shown = toggleKiGraphFilterKeyVisibility(hidden, 'entity:person', 'entity');
    expect(isKiGraphFilterKeyVisible('entity:person', 'entity', shown)).toBe(true);
    expect(shown.has('entity')).toBe(false);
  });

  it('returns only visible nodes and edges', () => {
    const filter = {
      hiddenKeys: new Set(['entity:person', 'memory:session']),
      hideUnconnected: false,
    };
    const visible = getVisibleKiGraph(sampleGraph, filter, connectedNodeIds);
    expect(visible.nodes.map(({ kiId }) => kiId).sort()).toEqual(['e3', 'f1', 'w1']);
    expect(visible.edges).toEqual([
      { id: 'x3', source: 'f1', target: 'w1', relation: 'created_by' },
    ]);
  });

  it('hides edges when either endpoint is hidden', () => {
    const nodeById = new Map(sampleGraph.nodes.map((node) => [node.kiId, node]));
    const edge = sampleGraph.edges[0];
    expect(
      isKiGraphEdgeHidden(
        nodeById.get(edge.source),
        nodeById.get(edge.target),
        kindOnlyFilter,
        connectedNodeIds
      )
    ).toBe(false);

    const withHiddenTarget = { hiddenKeys: new Set(['entity:person']), hideUnconnected: false };
    expect(
      isKiGraphEdgeHidden(
        nodeById.get(edge.source),
        nodeById.get(edge.target),
        withHiddenTarget,
        connectedNodeIds
      )
    ).toBe(true);
  });

  it('clears selection when the selected node is hidden', () => {
    const bySubtype = { hiddenKeys: new Set(['entity:person']), hideUnconnected: false };
    expect(shouldClearKiGraphSelection('e1', sampleGraph, bySubtype, connectedNodeIds)).toBe(true);
    expect(shouldClearKiGraphSelection('e1', sampleGraph, kindOnlyFilter, connectedNodeIds)).toBe(
      false
    );
    expect(shouldClearKiGraphSelection(undefined, sampleGraph, bySubtype, connectedNodeIds)).toBe(
      false
    );
  });

  it('detects when every node is hidden', () => {
    expect(areAllKiGraphNodesHidden(sampleGraph, kindOnlyFilter, connectedNodeIds)).toBe(false);
    expect(
      areAllKiGraphNodesHidden(
        sampleGraph,
        { hiddenKeys: new Set(['entity', 'fact', 'memory', 'workflow']), hideUnconnected: false },
        connectedNodeIds
      )
    ).toBe(true);
    expect(
      areAllKiGraphNodesHidden(
        sampleGraph,
        {
          hiddenKeys: new Set([
            'entity:person',
            'entity:place',
            'fact:preference',
            'memory:session',
            'workflow',
          ]),
          hideUnconnected: false,
        },
        connectedNodeIds
      )
    ).toBe(true);
  });
});

describe('hide unconnected', () => {
  const connectedNodeIds = buildKiGraphConnectedNodeIds(sampleGraph);
  const defaultFilter = createDefaultKiGraphFilterState();

  it('hides degree-zero nodes when hideUnconnected is on by default', () => {
    expect(defaultFilter.hideUnconnected).toBe(true);
    expect(
      isKiGraphNodeHidden(graphNode('e2', 'entity', 'person'), defaultFilter, connectedNodeIds)
    ).toBe(true);
    const visible = getVisibleKiGraph(sampleGraph, defaultFilter, connectedNodeIds);
    expect(visible.nodes.map(({ kiId }) => kiId).sort()).toEqual(['e1', 'e3', 'f1', 'm1', 'w1']);
  });

  it('shows unconnected nodes when hideUnconnected is off', () => {
    const filter = { ...defaultFilter, hideUnconnected: false };
    expect(isKiGraphNodeHidden(graphNode('e2', 'entity', 'person'), filter, connectedNodeIds)).toBe(
      false
    );
  });

  it('combines with kind filters', () => {
    const filter = { hiddenKeys: new Set(['entity:place']), hideUnconnected: true };
    const visible = getVisibleKiGraph(sampleGraph, filter, connectedNodeIds);
    expect(visible.nodes.map(({ kiId }) => kiId).sort()).toEqual(['e1', 'f1', 'm1', 'w1']);
  });

  it('clears selection when the selected unconnected node is hidden', () => {
    expect(shouldClearKiGraphSelection('e2', sampleGraph, defaultFilter, connectedNodeIds)).toBe(
      true
    );
    expect(
      shouldClearKiGraphSelection(
        'e2',
        sampleGraph,
        { ...defaultFilter, hideUnconnected: false },
        connectedNodeIds
      )
    ).toBe(false);
  });
});
