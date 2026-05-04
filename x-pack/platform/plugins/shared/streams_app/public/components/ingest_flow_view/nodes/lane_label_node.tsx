/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { EuiText } from '@elastic/eui';

export interface LaneLabelNodeData extends Record<string, unknown> {
  label: string;
}

type LaneLabelNodeType = Node<LaneLabelNodeData, 'laneLabel'>;

export const LaneLabelNode = memo(({ data }: NodeProps<LaneLabelNodeType>) => {
  return (
    <EuiText size="s" color="subdued">
      <strong>{data.label}</strong>
    </EuiText>
  );
});

LaneLabelNode.displayName = 'LaneLabelNode';
