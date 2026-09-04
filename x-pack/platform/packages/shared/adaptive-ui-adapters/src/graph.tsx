/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ViewSpec } from '@kbn/adaptive-ui';
import { Callout, Graph, View, toViewSpec } from '@kbn/adaptive-ui/jsx';
import { graphOmissionNote, toGraphTopology } from './shared';

/**
 * Mirror of the `graph` attachment data (Agent Builder platform). Only the
 * presentational topology subset is mirrored here.
 */
export interface GraphNode {
  id: string;
  label?: string;
  type?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  weight?: number;
}

export interface GraphData {
  title?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * The attachment's `type` (`user`, `host`) becomes the node's group kicker; the
 * payload carries no health, so nodes stay untoned and the primitive drops its
 * status dots.
 */
export const toGraphViewSpec = ({ title, nodes, edges }: GraphData): ViewSpec => {
  const topology = toGraphTopology(
    nodes.map(({ id, label, type }) => ({ id, label: label ?? id, group: type })),
    edges.map(({ source, target, label, weight }) => ({
      source,
      target,
      label,
      ...(weight != null && weight >= 0 ? { weight } : {}),
    }))
  );
  const omissionNote = graphOmissionNote(topology);

  return toViewSpec(
    <View title={title ?? 'Graph'} subtitle="Topology">
      {topology.nodes.length === 0 ? (
        <Callout tone="neutral">This graph has no nodes to draw.</Callout>
      ) : (
        <>
          <Graph label="Topology" nodes={topology.nodes} edges={topology.edges} />
          {omissionNote && <Callout tone="warning">{omissionNote}</Callout>}
        </>
      )}
    </View>
  );
};

export const sampleGraph: GraphData = {
  title: 'Lateral movement path',
  nodes: [
    { id: 'a.wong', label: 'a.wong', type: 'user' },
    { id: 'finance-web-03', label: 'finance-web-03', type: 'host' },
    { id: 'finance-db-01', label: 'finance-db-01', type: 'host' },
  ],
  edges: [
    { source: 'a.wong', target: 'finance-web-03', label: 'authenticated' },
    { source: 'finance-web-03', target: 'finance-db-01', label: 'lateral move' },
  ],
};
