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
import { ESQLQueryNode } from './esql_query_node';
import { KibanaLinkNode } from './kibana_link_node';
import { AlertNode } from './alert_node';
import { useScratchpadNodeContext } from '../scratchpad_canvas/node_context';

export function SimpleNode(node: Node<ScratchpadNodeData>) {
  const { onUpdateNode } = useScratchpadNodeContext();
  const nodeData = node.data;
  const { euiTheme } = useEuiTheme();
  const isSelected = nodeData.selected || false;

  // Use dedicated ESQL query node component for ESQL queries
  if (nodeData.type === 'esql_query') {
    return <ESQLQueryNode node={node as Node<any>} onUpdateNode={onUpdateNode} />;
  }

  // Use dedicated Kibana link node component
  if (nodeData.type === 'kibana_link') {
    return <KibanaLinkNode node={node as Node<any>} />;
  }

  console.log(nodeData);
  // Use dedicated alert node component
  if (nodeData.type === 'alert') {
    return <AlertNode node={node as Node<any>} />;
  }

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <EuiCard
        title={nodeData.type === 'text_note' ? String(nodeData.title || 'Note') : 'Node'}
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
        </EuiText>
      </EuiCard>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
