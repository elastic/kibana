/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { Edge, IsValidConnection, OnConnectStart } from '@xyflow/react';
import type { Unit } from '../../../../services/unit_repository';
import {
  canConnectLine,
  canMoveLine,
  type UnitLineMove,
  type UnitLineOrigin,
  type UnitLineTarget,
} from '../../../../services/unit_connections';
import { readLineOrigin, readLineTarget } from './build_unit_connection_edges';
import type { PendingConnection } from './canvas_connection_highlight';
import type { ClassicCanvasNode } from './types';

type MovedLine = Pick<Edge, 'source' | 'sourceHandle' | 'target'>;

interface PendingConnectionHandlers {
  pendingConnection: PendingConnection | null;
  startConnection: OnConnectStart;
  endConnection: () => void;
  startReconnect: (edge: MovedLine) => void;
  endReconnect: () => void;
  isValidConnection: IsValidConnection;
}

/** Tracks the line dragged on the Map and the nodes that can take it. */
export const usePendingConnection = (
  nodes: readonly ClassicCanvasNode[],
  unit: Unit
): PendingConnectionHandlers => {
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);

  // The line being moved, if any. Drops are then checked as a move of that line,
  // so a rule can swap its one connection for another target.
  const reconnectingRef = useRef<Pick<UnitLineMove, 'previousOrigin' | 'previousTarget'> | null>(
    null
  );

  const canDropConnection = useCallback(
    (origin: UnitLineOrigin, target: UnitLineTarget): boolean => {
      const reconnecting = reconnectingRef.current;
      return reconnecting
        ? canMoveLine(unit, { ...reconnecting, origin, target })
        : canConnectLine(unit, origin, target);
    },
    [unit]
  );

  const startReconnect = useCallback(
    (edge: MovedLine) => {
      const previousOrigin = readLineOrigin(nodes, edge.source, edge.sourceHandle);
      const previousTarget = readLineTarget(nodes, edge.target);
      reconnectingRef.current =
        previousOrigin && previousTarget ? { previousOrigin, previousTarget } : null;
    },
    [nodes]
  );

  const endReconnect = useCallback(() => {
    reconnectingRef.current = null;
  }, []);

  const startConnection = useCallback<OnConnectStart>(
    (_event, { nodeId, handleId, handleType }) => {
      const origin = handleType === 'source' ? readLineOrigin(nodes, nodeId, handleId) : undefined;
      if (!origin || nodeId === null) {
        setPendingConnection(null);
        return;
      }
      const targetIds = nodes
        .map(({ id }) => id)
        .filter((id) => {
          const target = readLineTarget(nodes, id);
          return target && canDropConnection(origin, target);
        });
      setPendingConnection({ originId: nodeId, targetIds: new Set(targetIds) });
    },
    [canDropConnection, nodes]
  );

  const endConnection = useCallback(() => {
    setPendingConnection(null);
  }, []);

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      const origin = readLineOrigin(nodes, connection.source, connection.sourceHandle);
      const target = readLineTarget(nodes, connection.target);
      return origin !== undefined && target !== undefined && canDropConnection(origin, target);
    },
    [canDropConnection, nodes]
  );

  return {
    pendingConnection,
    startConnection,
    endConnection,
    startReconnect,
    endReconnect,
    isValidConnection,
  };
};
