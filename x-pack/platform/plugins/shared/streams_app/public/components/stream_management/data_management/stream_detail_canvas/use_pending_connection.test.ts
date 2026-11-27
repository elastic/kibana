/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { Unit } from '../../../../services/unit_repository';
import {
  configuredDestinationNodeId,
  configuredRoutingNodeId,
  configuredSourceNodeId,
} from './build_unit_connection_edges';
import {
  DESTINATION_NODE_TYPE,
  ROUTING_NODE_TYPE,
  SOURCE_NODE_TYPE,
  type ClassicCanvasNode,
} from './types';
import { usePendingConnection } from './use_pending_connection';

// `logs-in` already sends to `es-logs`. `metrics-in` (Prometheus) shares no signal with any node.
// `docs-router` only handles Documents (`docs`) and routes to `es-docs`.
const unit: Unit = {
  unit: {
    sources: [
      { id: 'logs-in', type: 'otlp', supported_telemetry: ['logs'] },
      { id: 'metrics-in', type: 'prometheus_remote_write', supported_telemetry: ['metrics'] },
      { id: 'docs-in', type: 'bulk', supported_telemetry: ['docs'] },
    ],
    destinations: [
      { id: 'es-logs', type: 'elasticsearch', supported_telemetry: ['logs'] },
      { id: 'es-archive', type: 'elasticsearch', supported_telemetry: ['logs'] },
      { id: 'es-docs', type: 'elasticsearch', supported_telemetry: ['docs'] },
    ],
    pipelines: [
      {
        id: 'logs-line',
        supported_telemetry: ['logs'],
        config: [
          { name: 'sources', value: ['logs-in'] },
          { name: 'destinations', value: ['es-logs'] },
        ],
      },
      {
        id: 'docs-router',
        supported_telemetry: ['docs'],
        config: [{ name: 'routes', value: [{ destinations: ['es-docs'] }] }],
      },
    ],
  },
  ui_metadata: {},
};

const sourceNode = (sourceId: string): ClassicCanvasNode => ({
  id: configuredSourceNodeId(sourceId),
  type: SOURCE_NODE_TYPE,
  position: { x: 0, y: 0 },
  data: { title: sourceId, subtitle: '', sourceId },
});

const destinationNode = (destinationId: string): ClassicCanvasNode => ({
  id: configuredDestinationNodeId(destinationId),
  type: DESTINATION_NODE_TYPE,
  position: { x: 0, y: 0 },
  data: { title: destinationId, hasSavedSource: true, destinationId },
});

const routingNode = (pipelineId: string): ClassicCanvasNode => ({
  id: configuredRoutingNodeId(pipelineId),
  type: ROUTING_NODE_TYPE,
  position: { x: 0, y: 0 },
  data: { pipelineId, rules: [] },
});

const LOGS_IN = configuredSourceNodeId('logs-in');
const METRICS_IN = configuredSourceNodeId('metrics-in');
const DOCS_IN = configuredSourceNodeId('docs-in');
const ES_LOGS = configuredDestinationNodeId('es-logs');
const ES_ARCHIVE = configuredDestinationNodeId('es-archive');
const ES_DOCS = configuredDestinationNodeId('es-docs');
const DOCS_ROUTER = configuredRoutingNodeId('docs-router');

const nodes = [
  sourceNode('logs-in'),
  sourceNode('metrics-in'),
  sourceNode('docs-in'),
  routingNode('docs-router'),
  destinationNode('es-logs'),
  destinationNode('es-archive'),
  destinationNode('es-docs'),
];

const renderPendingConnection = () => renderHook(() => usePendingConnection(nodes, unit));

type HookResult = ReturnType<typeof renderPendingConnection>['result'];

const dragFrom = (result: HookResult, nodeId: string, handleType: 'source' | 'target' = 'source') =>
  act(() =>
    result.current.startConnection(new MouseEvent('mousemove'), {
      nodeId,
      handleId: null,
      handleType,
    })
  );

describe('usePendingConnection', () => {
  it('records the origin and the nodes that can take a new line until the drag ends', () => {
    const { result } = renderPendingConnection();

    dragFrom(result, LOGS_IN);

    expect(result.current.pendingConnection).toEqual({
      originId: LOGS_IN,
      targetIds: new Set([ES_ARCHIVE]),
    });

    act(() => result.current.endConnection());
    expect(result.current.pendingConnection).toBeNull();
  });

  it('refuses a Prometheus source on a routing node that only handles Documents', () => {
    const { result } = renderPendingConnection();

    dragFrom(result, METRICS_IN);
    expect(result.current.pendingConnection).toEqual({
      originId: METRICS_IN,
      targetIds: new Set(),
    });
    expect(
      result.current.isValidConnection({
        source: METRICS_IN,
        sourceHandle: null,
        target: DOCS_ROUTER,
        targetHandle: null,
      })
    ).toBe(false);

    dragFrom(result, DOCS_IN);
    expect(result.current.pendingConnection?.targetIds).toEqual(new Set([DOCS_ROUTER, ES_DOCS]));
  });

  it('has no pending connection when the drag has no readable origin', () => {
    const { result } = renderPendingConnection();

    dragFrom(result, ES_LOGS, 'target');
    expect(result.current.pendingConnection).toBeNull();

    dragFrom(result, 'missing-node');
    expect(result.current.pendingConnection).toBeNull();
  });

  it('judges a moved line as a move, so its current target can take it back', () => {
    const { result } = renderPendingConnection();

    act(() =>
      result.current.startReconnect({ source: LOGS_IN, sourceHandle: null, target: ES_LOGS })
    );
    dragFrom(result, LOGS_IN);
    expect(result.current.pendingConnection?.targetIds).toEqual(new Set([ES_LOGS, ES_ARCHIVE]));

    act(() => result.current.endReconnect());
    dragFrom(result, LOGS_IN);
    expect(result.current.pendingConnection?.targetIds).toEqual(new Set([ES_ARCHIVE]));
  });

  it('accepts only the drops the rules allow', () => {
    const { result } = renderPendingConnection();
    const lineTo = (target: string) => ({
      source: LOGS_IN,
      sourceHandle: null,
      target,
      targetHandle: null,
    });

    expect(result.current.isValidConnection(lineTo(ES_ARCHIVE))).toBe(true);
    expect(result.current.isValidConnection(lineTo(ES_LOGS))).toBe(false);
  });
});
