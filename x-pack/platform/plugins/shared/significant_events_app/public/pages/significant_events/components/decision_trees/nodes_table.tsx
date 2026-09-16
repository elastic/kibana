/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBasicTable, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DecisionNodeView } from '@kbn/nightshift-decision-trees';
import { getDecisionNodeTypeLabel } from './labels';

const NODE_TYPE_COLORS: Record<DecisionNodeView['node_type'], string> = {
  symptom: 'success',
  evidence_gatherer: 'primary',
  decision: 'warning',
  end: 'danger',
};

interface NodesTableProps {
  nodes: DecisionNodeView[];
}

export function NodesTable({ nodes }: NodesTableProps) {
  const columns: Array<EuiBasicTableColumn<DecisionNodeView>> = [
    {
      field: 'node_id',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.nodes.id', {
        defaultMessage: 'ID',
      }),
      width: '80px',
      render: (nodeId: string) => <code>{nodeId}</code>,
    },
    {
      field: 'node_type',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.nodes.type', {
        defaultMessage: 'Type',
      }),
      width: '160px',
      render: (nodeType: DecisionNodeView['node_type']) => (
        <EuiBadge color={NODE_TYPE_COLORS[nodeType] ?? 'hollow'}>
          {getDecisionNodeTypeLabel(nodeType)}
        </EuiBadge>
      ),
    },
    {
      field: 'label',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.nodes.label', {
        defaultMessage: 'Label',
      }),
    },
    {
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.nodes.metadata', {
        defaultMessage: 'Metadata',
      }),
      render: (node: DecisionNodeView) => node.node_metadata?.description ?? '-',
    },
  ];

  return (
    <EuiBasicTable
      items={nodes}
      columns={columns}
      tableLayout="auto"
      data-test-subj="nightshiftDecisionTreeNodesTable"
    />
  );
}
