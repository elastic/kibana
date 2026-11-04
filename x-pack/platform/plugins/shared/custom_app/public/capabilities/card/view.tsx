/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import { CardFrame } from '../../components/container_frames';
import { NodeRenderer } from '../../components/node_renderer';
import type { CapabilityViewProps } from '../capability_views';

export const CardView = ({ node, text }: CapabilityViewProps<AppNodeOfType<'card'>>) => (
  <CardFrame
    nodeId={node.id}
    title={node.title === undefined ? undefined : text(node.title)}
    description={node.description === undefined ? undefined : text(node.description)}
    icon={node.icon}
  >
    {node.children.map((child) => (
      <NodeRenderer key={child.id} node={child} />
    ))}
  </CardFrame>
);
