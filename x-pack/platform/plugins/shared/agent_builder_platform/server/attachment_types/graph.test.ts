/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphAttachmentData } from '../../common/attachments';
import { GRAPH_ATTACHMENT_TYPE } from '../../common/attachments';
import { createGraphAttachmentType } from './graph';
import { renderSurface, surfaceContext } from './test_helpers';

const node = (id: string, label: string) => ({ id, position: { x: 0, y: 0 }, data: { label } });
const edge = (source: string, target: string, label?: string) => ({
  id: `${source}-${target}`,
  source,
  target,
  type: 'default',
  ...(label ? { label } : {}),
});

const toComposition = (data: GraphAttachmentData) =>
  createGraphAttachmentType().toSurfaceComposition?.(
    { id: 'graph-1', type: GRAPH_ATTACHMENT_TYPE, data },
    surfaceContext
  );

describe('graph attachment type', () => {
  describe('toSurfaceComposition', () => {
    it('shows the relationships as a table, by node label, and the nodes without any', async () => {
      const composition = await toComposition({
        title: 'Checkout',
        description: 'Service dependencies',
        nodes: [node('a', 'frontend'), node('b', 'cart'), node('c', 'ledger')],
        edges: [edge('a', 'b', 'calls')],
      });

      expect(composition).toEqual({
        type: 'view',
        title: 'Checkout',
        subtitle: 'Service dependencies',
        body: [
          {
            type: 'table',
            columns: [{ label: 'From' }, { label: 'Relationship' }, { label: 'To' }],
            rows: [['frontend', 'calls', 'cart']],
          },
          { type: 'table', columns: [{ label: 'Not connected' }], rows: [['ledger']] },
        ],
      });

      const { valid, slack } = await renderSurface(composition);
      expect(valid).toBe(true);
      expect(slack).toContain('frontend');
    });

    it('leaves out the relationship column when no edge has a label', async () => {
      const composition = await toComposition({
        nodes: [node('a', 'A'), node('b', 'B')],
        edges: [edge('a', 'b')],
      });

      expect(composition?.title).toBe('Graph');
      expect(composition?.body).toEqual([
        { type: 'table', columns: [{ label: 'From' }, { label: 'To' }], rows: [['A', 'B']] },
      ]);
    });

    it('lists the nodes when there are no edges', async () => {
      const composition = await toComposition({ nodes: [node('a', 'A')], edges: [] });

      expect(composition?.body).toEqual([
        { type: 'table', columns: [{ label: 'Node' }], rows: [['A']] },
      ]);
    });

    it('shows the first rows of a large graph and counts the rest, and still renders', async () => {
      const nodes = Array.from({ length: 2000 }, (_, index) => node(`n${index}`, `x`.repeat(600)));
      const edges = nodes.slice(1, 120).map(({ id }) => edge('n0', id, 'y'.repeat(600)));

      const composition = await toComposition({ nodes, edges });

      expect(composition?.body.map(({ type }) => type)).toEqual([
        'table',
        'context',
        'table',
        'context',
      ]);
      expect(JSON.stringify(composition?.body[1])).toContain('69 more not shown');

      const { valid, errors } = await renderSurface(composition);
      expect(errors).toEqual([]);
      expect(valid).toBe(true);
    });
  });
});
