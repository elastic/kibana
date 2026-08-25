/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callout, graph, view } from '@kbn/adaptive-ui/builders';
import type { BodyNode, Tone, ViewSpec } from '@kbn/adaptive-ui';
import { graphOmissionNote, toGraphTopology } from './shared';

/**
 * Mirror of the `observability.service-map` attachment data. The canonical type
 * lives in the APM/Observability plugins; only the presentational topology subset
 * is mirrored here.
 */
export interface ServiceMapService {
  name: string;
  type?: string;
  health?: string;
}

export interface ServiceMapConnection {
  source: string;
  target: string;
  latency_ms?: number;
  error_rate?: number;
  throughput_tpm?: number;
}

export interface ServiceMapData {
  services: ServiceMapService[];
  connections: ServiceMapConnection[];
}

const HEALTH_TONE: Record<string, Tone> = {
  healthy: 'success',
  warning: 'warning',
  critical: 'danger',
  unknown: 'neutral',
};

/** Latency and error rate, joined for one edge chip. `undefined` when neither is reported. */
const connectionLabel = ({ latency_ms: latency, error_rate: errorRate }: ServiceMapConnection) => {
  const parts: string[] = [];
  if (latency != null) {
    parts.push(`${latency} ms`);
  }
  if (errorRate != null) {
    parts.push(`${(errorRate * 100).toFixed(1)}%`);
  }
  return parts.length === 0 ? undefined : parts.join(' · ');
};

const errorRateTone = (errorRate?: number): Tone | undefined => {
  if (errorRate == null) {
    return undefined;
  }
  if (errorRate >= 0.05) {
    return 'danger';
  }
  return errorRate >= 0.01 ? 'warning' : undefined;
};

/**
 * Service health becomes node tone, per-dependency latency and error rate the
 * edge label, and throughput the edge weight (stroke width) — so the whole
 * presentational payload survives in the diagram without a companion table.
 */
export const toServiceMapViewSpec = ({ services, connections }: ServiceMapData): ViewSpec => {
  const body: BodyNode[] = [];

  const topology = toGraphTopology(
    services.map(({ name, type, health }) => ({
      id: name,
      label: name,
      tone: health ? HEALTH_TONE[health.toLowerCase()] ?? 'neutral' : undefined,
      group: type,
    })),
    connections.map((connection) => ({
      source: connection.source,
      target: connection.target,
      label: connectionLabel(connection),
      tone: errorRateTone(connection.error_rate),
      ...(connection.throughput_tpm != null && connection.throughput_tpm >= 0
        ? { weight: connection.throughput_tpm }
        : {}),
    }))
  );

  if (topology.nodes.length === 0) {
    body.push(callout({ tone: 'neutral', body: 'This service map has no services to draw.' }));
  } else {
    body.push(graph({ label: 'Dependencies', nodes: topology.nodes, edges: topology.edges }));
    const note = graphOmissionNote(topology);
    if (note) {
      body.push(callout({ tone: 'warning', body: note }));
    }
  }

  return view({ title: 'Service map', subtitle: 'Service dependencies', body });
};

export const sampleServiceMap: ServiceMapData = {
  services: [
    { name: 'checkout', type: 'service', health: 'critical' },
    { name: 'payment-service', type: 'service', health: 'critical' },
    { name: 'cart', type: 'service', health: 'healthy' },
    { name: 'postgres', type: 'db', health: 'warning' },
  ],
  connections: [
    {
      source: 'checkout',
      target: 'payment-service',
      latency_ms: 320,
      error_rate: 0.061,
      throughput_tpm: 1200,
    },
    { source: 'checkout', target: 'cart', latency_ms: 45, error_rate: 0.001, throughput_tpm: 1800 },
    {
      source: 'payment-service',
      target: 'postgres',
      latency_ms: 210,
      error_rate: 0.02,
      throughput_tpm: 1100,
    },
  ],
};
