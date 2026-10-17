/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  GRAPH_ATTACHMENT_TYPE,
  type GraphAttachmentData,
  type GraphEdge,
  type GraphNode,
} from '../../common/attachments';
import { createGraphAttachmentType } from './graph';

const node = (id: string, label: string): GraphNode => ({
  id,
  position: { x: 0, y: 0 },
  data: { label },
});

const edge = (source: string, target: string, label?: string): GraphEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: 'default',
  label,
});

const toSurfaceComposition = async (data: GraphAttachmentData) =>
  createGraphAttachmentType().toSurfaceComposition?.(
    { id: 'graph-1', type: GRAPH_ATTACHMENT_TYPE, data },
    { request: httpServerMock.createKibanaRequest(), spaceId: 'default' }
  );

describe('graph attachment type', () => {
  describe('toSurfaceComposition', () => {
    it('lists the nodes and the edges between them, by label', async () => {
      expect(
        await toSurfaceComposition({
          title: 'Checkout',
          description: 'Service dependencies',
          nodes: [node('a', 'frontend'), node('b', 'cart')],
          edges: [edge('a', 'b', 'calls')],
        })
      ).toEqual({
        type: 'view',
        title: 'Checkout',
        subtitle: 'Service dependencies',
        body: [
          {
            type: 'markdown',
            text: '**Nodes**\n- frontend\n- cart\n\n**Edges**\n- frontend → cart (calls)',
          },
        ],
      });
    });

    it('defaults the title, and leaves out the edges when there are none', async () => {
      const composition = await toSurfaceComposition({ nodes: [node('a', 'frontend')], edges: [] });

      expect(composition?.title).toBe('Graph');
      expect(composition?.body).toEqual([{ type: 'markdown', text: '**Nodes**\n- frontend' }]);
    });

    it('falls back to the id of an edge endpoint that is not a node', async () => {
      const composition = await toSurfaceComposition({
        nodes: [node('a', 'frontend')],
        edges: [edge('a', 'missing')],
      });

      expect(composition?.body).toEqual([
        { type: 'markdown', text: '**Nodes**\n- frontend\n\n**Edges**\n- frontend → missing' },
      ]);
    });
  });
});
