/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceField } from '../../types/app_state';
import { getIcon } from '../../helpers/style_choices';

interface ExploreVertex {
  field: string;
  [key: string]: unknown;
}

interface ExploreConnection {
  source: number;
  target: number;
  doc_count: number;
  weight: number;
}

interface ExploreResponse {
  vertices: ExploreVertex[];
  connections: ExploreConnection[];
}

const styleVertices = (vertices: ExploreVertex[], fields: WorkspaceField[]): ExploreVertex[] =>
  vertices.map((vertex) => {
    const field = fields.find(({ name }) => name === vertex.field);
    if (!field) {
      return vertex;
    }
    return {
      ...vertex,
      color: field.color,
      icon: getIcon(field.icon),
      fieldDef: field,
    };
  });

const createEdge = (connection: ExploreConnection, maxEdgeWeight: number) => ({
  source: connection.source,
  target: connection.target,
  doc_count: connection.doc_count,
  weight: connection.weight,
  width: Math.max(2, (connection.weight / maxEdgeWeight) * 10),
});

export const transformSearchResponse = (data: ExploreResponse, fields: WorkspaceField[]) => {
  const maxEdgeWeight = data.connections.reduce(
    (maximum, connection) => Math.max(maximum, connection.weight),
    0.00000001
  );
  return {
    nodes: styleVertices(data.vertices, fields),
    edges: data.connections.map((connection) => createEdge(connection, maxEdgeWeight)),
  };
};

export const transformExpandResponse = (data: ExploreResponse, fields: WorkspaceField[]) => {
  let maxEdgeWeight = 0.00000001;
  return {
    nodes: styleVertices(data.vertices, fields),
    edges: data.connections.map((connection) => {
      // Preserve expand's historical running-maximum edge sizing.
      maxEdgeWeight = Math.max(maxEdgeWeight, connection.weight);
      return createEdge(connection, maxEdgeWeight);
    }),
  };
};
