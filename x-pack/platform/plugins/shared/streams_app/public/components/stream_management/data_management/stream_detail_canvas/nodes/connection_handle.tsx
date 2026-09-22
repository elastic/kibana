/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { Position } from '@xyflow/react';
import { Handle } from '@xyflow/react';
import { i18n } from '@kbn/i18n';

export const CONNECTION_HANDLE_CLASS = 'streamsConnectionHandle';

const ConnectionTargetsContext = createContext<ReadonlySet<string> | null>(null);

/** Destination ids that can accept the line currently being dragged. */
export const ConnectionTargetsProvider = ConnectionTargetsContext.Provider;

interface ConnectionHandleProps {
  type: 'source' | 'target';
  position: Position;
  /** Configured unit nodes can start or receive a pipeline connection. */
  isConnectable: boolean;
  /** Destination id, used to highlight handles that can receive the dragged line. */
  destinationId?: string;
}

export function ConnectionHandle({
  type,
  position,
  isConnectable,
  destinationId,
}: ConnectionHandleProps) {
  const connectionTargets = useContext(ConnectionTargetsContext);
  const highlighted =
    type === 'target' &&
    destinationId !== undefined &&
    connectionTargets?.has(destinationId) === true;
  const className = [
    isConnectable ? CONNECTION_HANDLE_CLASS : undefined,
    highlighted ? 'streamsConnectionTarget' : undefined,
  ]
    .filter((name) => name !== undefined)
    .join(' ');

  return (
    <Handle
      type={type}
      position={position}
      isConnectable={isConnectable}
      isConnectableStart={type === 'source' && isConnectable}
      isConnectableEnd={type === 'target' && isConnectable}
      className={className || undefined}
      aria-label={
        type === 'source'
          ? i18n.translate('xpack.streams.canvas.connectionHandle.connectAriaLabel', {
              defaultMessage: 'Drag to connect this source',
            })
          : i18n.translate('xpack.streams.canvas.connectionHandle.receiveAriaLabel', {
              defaultMessage: 'Drop to connect a source',
            })
      }
    />
  );
}
