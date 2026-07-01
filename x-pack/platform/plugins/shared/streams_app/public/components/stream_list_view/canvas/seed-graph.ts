/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The production-shaped Elastic logs topology the canvas opens with.
//
// Topology rules reflected here:
//   - a SOURCE has a single output (one parse pipeline);
//   - a PIPELINE has a single output (it transforms data, then hands off to
//     exactly one next step);
//   - only a ROUTING node fans out to multiple destinations/branches.
// So any "duplicate / split" is modelled as pipeline → routing → many.

import type { Edge, Node } from '@xyflow/react';
import { routingData } from './node-data';
import type { DestinationNodeData, PipelineNodeData, SourceNodeData } from './types';

// Approximate rendered heights of each node type. Edges attach at a node's
// vertical CENTER (its handle), so we position nodes by the center line of
// their row and derive the top-left Y by subtracting half the height. Keeping
// every node in a chain/row on the same center line makes the horizontal
// connectors perfectly straight.
const NODE_HEIGHT = { source: 96, pipeline: 40, routing: 64, destination: 70 } as const;

// Small builders so the seed graph reads as a topology rather than a wall of
// object literals. They mirror the data shapes the node renderers expect.
// `cy` is the row's CENTER line; the builder converts it to a top-left Y.
function srcNode(id: string, x: number, cy: number, d: SourceNodeData): Node {
  return { id, type: 'source', position: { x, y: cy - NODE_HEIGHT.source / 2 }, data: d };
}
function pipeNode(id: string, x: number, cy: number, d: PipelineNodeData): Node {
  return { id, type: 'pipeline', position: { x, y: cy - NODE_HEIGHT.pipeline / 2 }, data: d };
}
function routeNode(id: string, x: number, cy: number): Node {
  return {
    id,
    type: 'routing',
    position: { x, y: cy - NODE_HEIGHT.routing / 2 },
    data: routingData(),
  };
}
function dstNode(id: string, x: number, cy: number, d: DestinationNodeData): Node {
  return { id, type: 'destination', position: { x, y: cy - NODE_HEIGHT.destination / 2 }, data: d };
}
function dst(title: string, meta: string, storage?: 'external'): DestinationNodeData {
  return { title, mode: 'configured', meta, status: 'Good', ...(storage ? { storage } : {}) };
}
function seedEdge(source: string, target: string): Edge {
  return { id: `e-${source}-${target}`, source, target, type: 'pipelineRouting' };
}

// Columns: sources(0) → parse(300) → enrich(580) → route(860) →
// post-route transforms(1140) → destinations(1420). Three branchy flows.
//
// Layout: each flow gets its own non-overlapping horizontal BAND, and every
// routing node's branches are ordered top-to-bottom (a branch's post-route
// pipeline and its destination share the branch's Y). Because no node or edge
// ever leaves its band, and branches within a fan-out are vertically nested,
// the connectors never cross.
// All values below are ROW CENTER lines (not top-left); the node builders
// subtract half the node height. Each flow occupies its own band and its
// branch rows are evenly spaced, so connectors stay straight and never cross.
//   Band 1 — CloudWatch : rows 40 / 180 / 320   (main chain @ 180)
//   Band 2 — Kubernetes : rows 620 / 760 / 900  (main chain @ 760)
//   Band 3 — NGINX      : rows 1200 / 1340      (main chain @ 1270)
export const initialNodes: Node[] = [
  // ── Sources ────────────────────────────────────────────────────────────
  srcNode('src-cloudwatch', 0, 180, {
    title: 'AWS CloudWatch',
    subtitle: 'Logs · Push via Firehose',
    rate: '11.9k/s',
  }),
  srcNode('src-k8s', 0, 760, {
    title: 'Kubernetes',
    subtitle: 'Container logs · Elastic Agent',
    rate: '24.3k/s',
  }),
  srcNode('src-nginx', 0, 1270, {
    title: 'NGINX',
    subtitle: 'Access logs · Filebeat',
    rate: '8.2k/s',
  }),

  // ── Parse / decode (one per source) ───────────────────────────────────
  pipeNode('pipe-parse-cw', 300, 180, {
    title: 'Parse Firehose',
    eps: '11.9k eps',
    latency: '40ms',
  }),
  pipeNode('pipe-k8s-parse', 300, 760, {
    title: 'Parse container',
    eps: '24k eps',
    latency: '55ms',
  }),
  pipeNode('pipe-nginx-grok', 300, 1270, {
    title: 'GROK access',
    eps: '8.2k eps',
    latency: '22ms',
  }),

  // ── Enrich / transform (one per source) ───────────────────────────────
  pipeNode('pipe-cw-enrich', 580, 180, {
    title: 'Enrich CloudWatch',
    eps: '11.9k eps',
    latency: '12ms',
  }),
  pipeNode('pipe-k8s-trim', 580, 760, { title: 'Trim fields', eps: '24k eps', latency: '9ms' }),
  pipeNode('pipe-geoip', 580, 1270, { title: 'GeoIP enrich', eps: '8.2k eps', latency: '27ms' }),

  // ── Routing branches (the only fan-out nodes; centered in their band) ──
  routeNode('route-severity', 860, 180),
  routeNode('route-k8s', 860, 760),
  routeNode('route-nginx', 860, 1270),

  // ── Post-route transforms (each on its branch's row) ───────────────────
  pipeNode('pipe-pii', 1140, 40, { title: 'Redact PII', eps: '2.1k eps', latency: '18ms' }),
  pipeNode('pipe-cw-errors', 1140, 320, { title: 'Filter errors', eps: '900 eps', latency: '7ms' }),
  pipeNode('pipe-k8s-metrics', 1140, 760, {
    title: 'Extract metrics',
    eps: '24k eps',
    latency: '13ms',
  }),
  pipeNode('pipe-nginx-bots', 1140, 1340, { title: 'Tag bots', eps: '1.4k eps', latency: '9ms' }),

  // ── Destinations (each on its branch's row) ────────────────────────────
  // CloudWatch band: security(40) / cloudwatch(180) / alerts(320)
  dstNode('dst-security', 1420, 40, dst('logs-security.audit', '2.1k eps・18ms')),
  dstNode('dst-cloudwatch', 1420, 180, dst('logs-aws.cloudwatch', '9.8k eps・44ms')),
  dstNode('dst-cw-alerts', 1420, 320, dst('logs-cloudwatch.alerts', '900 eps・7ms')),
  // Kubernetes band: k8s(620) / metrics(760) / archive(900)
  dstNode('dst-k8s', 1420, 620, dst('logs-k8s.container', '24k eps・55ms')),
  dstNode('dst-k8s-metrics', 1420, 760, dst('metrics-k8s.pod', '24k eps・13ms')),
  dstNode('dst-archive', 1420, 900, dst('logs-archive.cold', 'S3 · external', 'external')),
  // NGINX band: nginx(1200) / bots(1340)
  dstNode('dst-nginx', 1420, 1200, dst('logs-nginx.access', '8.2k eps・49ms')),
  dstNode('dst-nginx-bots', 1420, 1340, dst('logs-nginx.bots', '1.4k eps・9ms')),
];

// Within each routing fan-out the branches are listed top-to-bottom so their
// vertical segments stay nested (no crossings).
export const initialEdges: Edge[] = [
  // CloudWatch: parse → enrich → route → (redact PII → security), cloudwatch, (filter errors → alerts)
  seedEdge('src-cloudwatch', 'pipe-parse-cw'),
  seedEdge('pipe-parse-cw', 'pipe-cw-enrich'),
  seedEdge('pipe-cw-enrich', 'route-severity'),
  seedEdge('route-severity', 'pipe-pii'), // top branch
  seedEdge('pipe-pii', 'dst-security'),
  seedEdge('route-severity', 'dst-cloudwatch'), // middle branch
  seedEdge('route-severity', 'pipe-cw-errors'), // bottom branch
  seedEdge('pipe-cw-errors', 'dst-cw-alerts'),
  // Kubernetes: parse → trim → route → container, (extract metrics → metrics), archive
  seedEdge('src-k8s', 'pipe-k8s-parse'),
  seedEdge('pipe-k8s-parse', 'pipe-k8s-trim'),
  seedEdge('pipe-k8s-trim', 'route-k8s'),
  seedEdge('route-k8s', 'dst-k8s'), // top branch
  seedEdge('route-k8s', 'pipe-k8s-metrics'), // middle branch
  seedEdge('pipe-k8s-metrics', 'dst-k8s-metrics'),
  seedEdge('route-k8s', 'dst-archive'), // bottom branch
  // NGINX: GROK → GeoIP → route → access, (tag bots → bots)
  seedEdge('src-nginx', 'pipe-nginx-grok'),
  seedEdge('pipe-nginx-grok', 'pipe-geoip'),
  seedEdge('pipe-geoip', 'route-nginx'),
  seedEdge('route-nginx', 'dst-nginx'), // top branch
  seedEdge('route-nginx', 'pipe-nginx-bots'), // bottom branch
  seedEdge('pipe-nginx-bots', 'dst-nginx-bots'),
];
