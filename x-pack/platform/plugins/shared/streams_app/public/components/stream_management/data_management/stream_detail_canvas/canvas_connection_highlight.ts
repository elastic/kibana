/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { FlowHighlightState } from './canvas_flow_highlight';

/** The line being dragged: the node it starts from and the nodes that can take it. */
export interface PendingConnection {
  originId: string;
  targetIds: ReadonlySet<string>;
}

const PendingConnectionContext = createContext<PendingConnection | null>(null);

export const PendingConnectionProvider = PendingConnectionContext.Provider;

export const usePendingConnectionContext = (): PendingConnection | null =>
  useContext(PendingConnectionContext);

/** Where a node stands against the line being dragged, or `undefined` while no line is dragged. */
export const useConnectionDimState = (id: string): FlowHighlightState | undefined => {
  const connection = usePendingConnectionContext();
  if (!connection) {
    return undefined;
  }
  return id === connection.originId || connection.targetIds.has(id) ? 'highlighted' : 'dimmed';
};
