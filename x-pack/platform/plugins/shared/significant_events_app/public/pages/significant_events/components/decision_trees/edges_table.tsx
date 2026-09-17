/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBasicTable, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DecisionEdgeView } from '@kbn/nightshift-decision-trees';

interface EdgesTableProps {
  edges: DecisionEdgeView[];
}

export function EdgesTable({ edges }: EdgesTableProps) {
  const columns: Array<EuiBasicTableColumn<DecisionEdgeView>> = [
    {
      field: 'source_node_id',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.edges.source', {
        defaultMessage: 'Source',
      }),
      width: '90px',
      render: (nodeId: string) => <code>{nodeId}</code>,
    },
    {
      field: 'target_node_id',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.edges.target', {
        defaultMessage: 'Target',
      }),
      width: '90px',
      render: (nodeId: string) => <code>{nodeId}</code>,
    },
    {
      field: 'condition',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.edges.condition', {
        defaultMessage: 'Condition',
      }),
    },
    {
      field: 'is_taken',
      name: i18n.translate('xpack.significantEventsApp.decisionTrees.edges.taken', {
        defaultMessage: 'Taken',
      }),
      width: '100px',
      render: (isTaken: boolean) =>
        isTaken ? (
          <EuiBadge color="success">
            {i18n.translate('xpack.significantEventsApp.decisionTrees.edges.takenYes', {
              defaultMessage: 'Taken',
            })}
          </EuiBadge>
        ) : (
          <span>-</span>
        ),
    },
  ];

  return (
    <EuiBasicTable
      items={edges}
      columns={columns}
      tableLayout="auto"
      tableCaption={i18n.translate('xpack.significantEventsApp.decisionTrees.edges.tableCaption', {
        defaultMessage: 'Decision tree edges',
      })}
      data-test-subj="nightshiftDecisionTreeEdgesTable"
    />
  );
}
