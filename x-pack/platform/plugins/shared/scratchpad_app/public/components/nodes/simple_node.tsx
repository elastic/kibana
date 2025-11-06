/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Node } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { EuiCard, EuiText } from '@elastic/eui';
import type { ScratchpadNodeData } from '../../hooks/use_scratchpad_state';

export function SimpleNode(node: Node<ScratchpadNodeData>) {
  const nodeData = node.data;

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <EuiCard
        title={nodeData.type}
        style={{ minWidth: '200px', maxWidth: '300px' }}
        textAlign="left"
      >
        <EuiText size="s">
          {nodeData.type === 'text_note' && <div>{String(nodeData.content || 'Empty note')}</div>}
          {nodeData.type === 'esql_query' && (
            <div>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {String(nodeData.query || 'No query')}
              </pre>
            </div>
          )}
          {nodeData.type === 'kibana_link' && <div>{String(nodeData.title || 'Link')}</div>}
        </EuiText>
      </EuiCard>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
