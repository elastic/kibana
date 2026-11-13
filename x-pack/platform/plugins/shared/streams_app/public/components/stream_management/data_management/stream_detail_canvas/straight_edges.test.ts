/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COLUMN_GAP, STRAIGHT_SNAP_THRESHOLD } from './canvas_constants';
import {
  getStraightSnapDelta,
  keepHandlesOnResize,
  straightenFlow,
  type ReadHandleOffset,
} from './straight_edges';
import { DESTINATION_NODE_TYPE, ROUTING_NODE_TYPE, SOURCE_NODE_TYPE } from './types';

const SOURCE_HEIGHT = 102;
const DESTINATION_HEIGHT = 134;
const ROUTING_HEIGHT = 122;
// Rows of a routing card: its rule handles are not at the middle of the card.
const RULE_OFFSETS: Record<string, number> = { 'rule-0': 55, 'rule-1': 81 };

const node = (id: string, type: string, height: number, x: number, y: number) => ({
  id,
  type,
  position: { x, y },
  measured: { width: 200, height },
});

const readHandleOffset: ReadHandleOffset = (nodeId, type, handleId) => {
  if (nodeId === 'unmeasured') {
    return undefined;
  }
  if (nodeId.startsWith('routing')) {
    return type === 'source' && handleId ? RULE_OFFSETS[handleId] : ROUTING_HEIGHT / 2;
  }
  return (nodeId.startsWith('source') ? SOURCE_HEIGHT : DESTINATION_HEIGHT) / 2;
};

describe('getStraightSnapDelta', () => {
  const nodes = [
    node('source', SOURCE_NODE_TYPE, SOURCE_HEIGHT, 0, 0),
    node('destination', DESTINATION_NODE_TYPE, DESTINATION_HEIGHT, COLUMN_GAP, 0),
  ];
  const edges = [{ source: 'source', target: 'destination' }];
  const snap = (moved: Record<string, number>, flow = { nodes, edges }) =>
    getStraightSnapDelta({
      ...flow,
      moved: new Map(Object.entries(moved).map(([id, y]) => [id, { x: COLUMN_GAP, y }])),
      readHandleOffset,
      threshold: STRAIGHT_SNAP_THRESHOLD,
    });

  it('levels the handles of two cards of different heights, which no grid step does', () => {
    // The source handle is at 51. The destination's is 67 below its top, so it is level at -16.
    expect(snap({ destination: -12 })).toBe(-4);
    expect(snap({ destination: -24 })).toBe(8);
  });

  it('shifts a dragged source towards the destination it feeds', () => {
    expect(snap({ source: 12 })).toBe(4);
  });

  it('leaves the grid position alone when no line is close to straight', () => {
    expect(snap({ destination: 0 })).toBe(0);
    expect(snap({ destination: -36 })).toBe(0);
  });

  it('levels a destination with the rule handle its line leaves from', () => {
    const flow = {
      nodes: [
        node('routing', ROUTING_NODE_TYPE, ROUTING_HEIGHT, 0, 0),
        node('destination', DESTINATION_NODE_TYPE, DESTINATION_HEIGHT, COLUMN_GAP, 0),
      ],
      edges: [{ source: 'routing', sourceHandle: 'rule-1', target: 'destination' }],
    };
    // rule-1 leaves at 81, the destination handle is 67 below its top.
    expect(snap({ destination: 12 }, flow)).toBe(2);
  });

  it('picks the line that needs the smallest shift', () => {
    const flow = {
      nodes: [
        node('source-a', SOURCE_NODE_TYPE, SOURCE_HEIGHT, 0, 0),
        node('source-b', SOURCE_NODE_TYPE, SOURCE_HEIGHT, 0, 10),
        node('destination', DESTINATION_NODE_TYPE, DESTINATION_HEIGHT, COLUMN_GAP, 0),
      ],
      edges: [
        { source: 'source-a', target: 'destination' },
        { source: 'source-b', target: 'destination' },
      ],
    };
    // Level with source-a at -16 and with source-b at -6.
    expect(snap({ destination: -12 }, flow)).toBe(-4);
    expect(snap({ destination: -8 }, flow)).toBe(2);
  });

  it('ignores lines between two dragged nodes and lines to unmeasured nodes', () => {
    expect(snap({ source: 0, destination: -12 })).toBe(0);
    expect(
      snap(
        { destination: -12 },
        {
          nodes: [
            node('unmeasured', SOURCE_NODE_TYPE, SOURCE_HEIGHT, 0, 0),
            node('destination', DESTINATION_NODE_TYPE, DESTINATION_HEIGHT, COLUMN_GAP, 0),
          ],
          edges: [{ source: 'unmeasured', target: 'destination' }],
        }
      )
    ).toBe(0);
  });
});

describe('straightenFlow', () => {
  it('straightens a chain end to end, each line from the handle it leaves', () => {
    const nodes = [
      node('source', SOURCE_NODE_TYPE, SOURCE_HEIGHT, 0, 0),
      node('routing', ROUTING_NODE_TYPE, ROUTING_HEIGHT, COLUMN_GAP, 0),
      node('destination', DESTINATION_NODE_TYPE, DESTINATION_HEIGHT, 2 * COLUMN_GAP, 0),
    ];
    const straightened = straightenFlow(
      nodes,
      [
        { source: 'source', target: 'routing' },
        { source: 'routing', sourceHandle: 'rule-0', target: 'destination' },
      ],
      readHandleOffset
    );

    // Routing: 51 - 61. Destination: the rule row at -10 + 55, less its own 67.
    expect(straightened.map(({ position }) => position.y)).toEqual([0, -10, -22]);
    expect(straightened[0]).toBe(nodes[0]);
  });

  it('leaves a node fed from several handles where the layout put it', () => {
    const nodes = [
      node('source-a', SOURCE_NODE_TYPE, SOURCE_HEIGHT, 0, 0),
      node('source-b', SOURCE_NODE_TYPE, SOURCE_HEIGHT, 0, 120),
      node('destination', DESTINATION_NODE_TYPE, DESTINATION_HEIGHT, COLUMN_GAP, 44),
    ];
    const edges = [
      { source: 'source-a', target: 'destination' },
      { source: 'source-b', target: 'destination' },
    ];

    expect(straightenFlow(nodes, edges, readHandleOffset)).toBe(nodes);
  });

  it('skips a move that would crowd another card in the same column', () => {
    const nodes = [
      node('routing', ROUTING_NODE_TYPE, ROUTING_HEIGHT, 0, 60),
      node('destination-a', DESTINATION_NODE_TYPE, DESTINATION_HEIGHT, COLUMN_GAP, -20),
      node('destination-b', DESTINATION_NODE_TYPE, DESTINATION_HEIGHT, COLUMN_GAP, 130),
    ];
    const edges = [
      { source: 'routing', sourceHandle: 'rule-0', target: 'destination-a' },
      { source: 'routing', sourceHandle: 'rule-1', target: 'destination-b' },
    ];

    // Level with their rules the two destinations would sit 26 apart, on top of each other.
    expect(straightenFlow(nodes, edges, readHandleOffset)).toBe(nodes);
  });

  it('moves only the requested nodes', () => {
    const nodes = [
      node('source', SOURCE_NODE_TYPE, SOURCE_HEIGHT, 0, 0),
      node('routing', ROUTING_NODE_TYPE, ROUTING_HEIGHT, COLUMN_GAP, 0),
      node('destination', DESTINATION_NODE_TYPE, DESTINATION_HEIGHT, 2 * COLUMN_GAP, 0),
    ];
    const straightened = straightenFlow(
      nodes,
      [
        { source: 'source', target: 'routing' },
        { source: 'routing', sourceHandle: 'rule-0', target: 'destination' },
      ],
      readHandleOffset,
      { onlyIds: new Set(['destination']) }
    );

    expect(straightened.map(({ position }) => position.y)).toEqual([0, 0, -12]);
  });

  it('waits for a node that is not measured yet', () => {
    const nodes = [
      node('unmeasured', SOURCE_NODE_TYPE, SOURCE_HEIGHT, 0, 0),
      node('destination', DESTINATION_NODE_TYPE, DESTINATION_HEIGHT, COLUMN_GAP, 0),
    ];

    expect(
      straightenFlow(nodes, [{ source: 'unmeasured', target: 'destination' }], readHandleOffset)
    ).toBe(nodes);
  });
});

describe('keepHandlesOnResize', () => {
  it('keeps the middle of a card in place when it grows or shrinks', () => {
    const heights = new Map<string, number>();
    const measured = [node('source', SOURCE_NODE_TYPE, SOURCE_HEIGHT, 0, 100)];
    // First measured at the height the layout reserved for it.
    expect(keepHandlesOnResize(measured, heights)).toBe(measured);

    const grown = keepHandlesOnResize(
      [node('source', SOURCE_NODE_TYPE, SOURCE_HEIGHT + 28, 0, 100)],
      heights
    );
    expect(grown[0].position).toEqual({ x: 0, y: 86 });

    const shrunk = keepHandlesOnResize(
      [{ ...grown[0], measured: { width: 200, height: SOURCE_HEIGHT } }],
      heights
    );
    expect(shrunk[0].position).toEqual({ x: 0, y: 100 });
  });

  it('centres a card first measured shorter than the height the layout reserved', () => {
    const [direct] = keepHandlesOnResize(
      [node('source', SOURCE_NODE_TYPE, SOURCE_HEIGHT - 28, 0, 0)],
      new Map()
    );

    expect(direct.position.y).toBe(14);
  });

  it('skips nodes that are not measured yet', () => {
    const heights = new Map<string, number>();
    const nodes = [{ id: 'source', type: SOURCE_NODE_TYPE, position: { x: 0, y: 0 } }];

    expect(keepHandlesOnResize(nodes, heights)).toBe(nodes);
    expect(heights.size).toBe(0);
  });
});
