/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, EdgeProps as xyEdgeProps } from '@xyflow/react';
import { NodeShape } from '../node';
import { GraphMetadata } from '..';

export { CustomPathEdge } from './custom_path_edge';

export interface EdgeData extends Record<string, unknown> {
  id: string;
  source: string;
  sourceShape: NodeShape;
  target: string;
  targetShape: NodeShape;
  label?: string;
  color?: 'primary' | 'danger' | 'warning';
  icon?: string;
  graphMetadata?: GraphMetadata;
  interactive: boolean;
  onClick?: (e: React.MouseEvent<HTMLElement>, edge: EdgeProps) => void;
}

export type EdgeProps = xyEdgeProps<Edge<EdgeData>>;
