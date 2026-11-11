/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import { ColumnsFrame } from '../../components/container_frames';
import { NodeRenderer } from '../../components/node_renderer';
import type { CapabilityViewProps } from '../capability_views';

export const ColumnsView = ({ node }: CapabilityViewProps<AppNodeOfType<'columns'>>) => (
  <ColumnsFrame nodeId={node.id} columns={node.columns as 2 | 3 | 4}>
    {node.children.map((child) => (
      <NodeRenderer key={child.id} node={child} />
    ))}
  </ColumnsFrame>
);
