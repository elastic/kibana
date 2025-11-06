/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Node } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { EuiCard, EuiText, useEuiTheme } from '@elastic/eui';
import type { ScratchpadNodeData } from '../../hooks/use_scratchpad_state';

export function SimpleNode(node: Node<ScratchpadNodeData>) {
  const nodeData = node.data;
  const { euiTheme } = useEuiTheme();
  const isSelected = nodeData.selected || false;

  console.log('Rendering SimpleNode', node.id, 'selected:', isSelected);

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <EuiCard
        title={
          nodeData.type === 'text_note'
            ? String(nodeData.title || 'Note')
            : nodeData.type === 'kibana_link'
            ? String(nodeData.title || 'Link')
            : 'ESQL Query'
        }
        style={{
          minWidth: '200px',
          maxWidth: '300px',
          border: isSelected
            ? `2px solid ${euiTheme.colors.primary}`
            : `1px solid ${euiTheme.colors.plainDark}`,
          boxShadow: isSelected
            ? `0 0 0 2px ${euiTheme.colors.primary}20`
            : 'none',
        }}
        textAlign="left"
      >
        <EuiText size="s">
          {nodeData.type === 'text_note' && (
            <div>{String(nodeData.content || 'Empty note')}</div>
          )}
          {nodeData.type === 'esql_query' && (
            <div>
              <pre style={{ fontSize: '12px', overflow: 'auto', margin: 0 }}>
                {String(nodeData.query || 'No query')}
              </pre>
            </div>
          )}
          {nodeData.type === 'kibana_link' && (
            <div>{String(nodeData.title || 'Link')}</div>
          )}
        </EuiText>
      </EuiCard>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
