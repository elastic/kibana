/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PositionXY {
  x: number;
  y: number;
}

export interface GraphMetadata {
  nodes: { [key: string]: { edgesIn: number; edgesOut: number } };
  edges: {
    [key: string]: { source: string; target: string; edgesStacked: number; edges: string[] };
  };
}
