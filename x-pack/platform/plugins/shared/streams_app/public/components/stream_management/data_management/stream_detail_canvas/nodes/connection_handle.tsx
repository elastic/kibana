/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { Position } from '@xyflow/react';
import { Handle, useNodeId } from '@xyflow/react';
import { i18n } from '@kbn/i18n';

export const CONNECTION_HANDLE_CLASS = 'streamsConnectionHandle';

const ConnectionTargetsContext = createContext<ReadonlySet<string> | null>(null);

/** Node ids that can accept the line currently being dragged. */
export const ConnectionTargetsProvider = ConnectionTargetsContext.Provider;

interface ConnectionHandleProps {
  /** Distinguishes several handles of the same type on one node. */
  id?: string;
  type: 'source' | 'target';
  position: Position;
  /** Configured unit nodes can start or receive a pipeline connection. */
  isConnectable: boolean;
  /**
   * Whether a new line can be dragged out of a source handle. Defaults to
   * `isConnectable`. Turn off when the node already has its one outgoing line,
   * which stays movable.
   */
  isConnectableStart?: boolean;
}

export function ConnectionHandle({
  id,
  type,
  position,
  isConnectable,
  isConnectableStart = isConnectable,
}: ConnectionHandleProps) {
  const nodeId = useNodeId();
  const connectionTargets = useContext(ConnectionTargetsContext);
  const canStart = type === 'source' && isConnectable && isConnectableStart;
  const canTarget = type === 'target' && isConnectable;
  const highlighted =
    type === 'target' && nodeId !== null && connectionTargets?.has(nodeId) === true;
  const className = useMemo(
    () =>
      [
        canTarget || canStart ? CONNECTION_HANDLE_CLASS : undefined,
        highlighted ? 'streamsConnectionTarget' : undefined,
      ]
        .filter((name) => name !== undefined)
        .join(' '),
    [canTarget, canStart, highlighted]
  );

  return (
    <Handle
      id={id}
      type={type}
      position={position}
      isConnectable={isConnectable}
      isConnectableStart={canStart}
      isConnectableEnd={type === 'target' && isConnectable}
      className={className || undefined}
      aria-label={
        type === 'source'
          ? canStart
            ? i18n.translate('xpack.streams.canvas.connectionHandle.connectAriaLabel', {
                defaultMessage: 'Drag to connect this source',
              })
            : undefined
          : i18n.translate('xpack.streams.canvas.connectionHandle.receiveAriaLabel', {
              defaultMessage: 'Drop to connect a source',
            })
      }
    />
  );
}
