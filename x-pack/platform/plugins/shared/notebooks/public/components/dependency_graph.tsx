/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CellDefinition } from '../../common/types';
import { buildGraphView, CELL_NODE_SIZE, SOURCE_NODE_SIZE } from '../model/graph_view';
import type { CellRuntime, ParamValue } from '../model/types';
import { TYPE_ICONS, getStatusBorderColor, getTypeLabel } from './cell_display';
import { CellStatusBadge } from './cell_status_badge';
import { useNotebook } from './notebook_context';
import { getResultSummary } from './result_preview';

type CellFlowNode = Node<{ cellId: string }, 'cell'>;
type SourceFlowNode = Node<{ label: string }, 'source'>;

const hiddenHandleCss = css`
  visibility: hidden;
`;

const formatParamValue = (value: ParamValue): string =>
  value === null ? 'null' : JSON.stringify(value);

/** What a node shows on hover: its latest result, bound params or error. */
const getNodeSummary = (cell: CellDefinition, { error, output, durationMs }: CellRuntime) => {
  if (error) return error;
  if (output?.kind === 'table') return getResultSummary(output.table, durationMs);
  if (output?.kind === 'input') {
    const params = Object.entries(output.params);
    return params.length > 0
      ? params.map(([name, value]) => `?${name} = ${formatParamValue(value)}`).join('\n')
      : undefined;
  }
  return getTypeLabel(cell);
};

const CellNode = ({ data: { cellId } }: NodeProps<CellFlowNode>) => {
  const { store } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const cells = useStateFromPublishingSubject(store.cells$);
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cellId));
  const cell = cells[cellId];
  if (!cell) return null;

  return (
    <div
      css={css`
        width: ${CELL_NODE_SIZE.width}px;
        height: ${CELL_NODE_SIZE.height}px;
        display: flex;
        align-items: center;
        padding: 0 ${euiTheme.size.s};
        background: ${euiTheme.colors.backgroundBasePlain};
        border-radius: ${euiTheme.border.radius.medium};
        box-shadow: inset 0 0 0 ${euiTheme.border.width.thick}
          ${getStatusBorderColor(runtime.status, euiTheme)};
        cursor: pointer;
      `}
      data-test-subj={`notebookGraphNode-${cell.name}`}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} css={hiddenHandleCss} />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={{ minWidth: 0 }}>
        <EuiFlexItem grow css={{ minWidth: 0 }}>
          <EuiToolTip
            content={<span css={{ whiteSpace: 'pre-line' }}>{getNodeSummary(cell, runtime)}</span>}
            position="bottom"
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} tabIndex={0}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={TYPE_ICONS[cell.type]} aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem css={{ minWidth: 0 }}>
                <EuiText size="s" className="eui-textTruncate">
                  <strong>{cell.name}</strong>
                </EuiText>
                <EuiText size="xs" color="subdued" className="eui-textTruncate">
                  {getTypeLabel(cell)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiToolTip>
        </EuiFlexItem>
        {runtime.status !== 'done' && (
          <EuiFlexItem grow={false}>
            <CellStatusBadge runtime={runtime} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <Handle type="source" position={Position.Right} isConnectable={false} css={hiddenHandleCss} />
    </div>
  );
};

const SourceNode = ({ data: { label } }: NodeProps<SourceFlowNode>) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        width: ${SOURCE_NODE_SIZE.width}px;
        height: ${SOURCE_NODE_SIZE.height}px;
        display: flex;
        align-items: center;
        padding: 0 ${euiTheme.size.s};
        background: ${euiTheme.colors.backgroundBaseSubdued};
        border: ${euiTheme.border.width.thin} dashed ${euiTheme.border.color};
        border-radius: ${euiTheme.border.radius.medium};
      `}
      data-test-subj={`notebookGraphSource-${label}`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={{ minWidth: 0 }}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="table" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiText size="xs" color="subdued" className="eui-textTruncate">
            {label}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Handle type="source" position={Position.Right} isConnectable={false} css={hiddenHandleCss} />
    </div>
  );
};

const NODE_TYPES: NodeTypes = { cell: CellNode, source: SourceNode };

/** The notebook's cells and data sources as a left-to-right dependency graph. */
export const DependencyGraph = ({ onSelectCell }: { onSelectCell: (cellId: string) => void }) => {
  const { store } = useNotebook();
  const { euiTheme, colorMode } = useEuiTheme();
  const cells = useStateFromPublishingSubject(store.cells$);
  const cellOrder = useStateFromPublishingSubject(store.cellOrder$);

  const { nodes, edges } = useMemo(() => {
    const view = buildGraphView(cells, cellOrder);
    return {
      nodes: view.nodes.map((node): CellFlowNode | SourceFlowNode =>
        node.kind === 'cell'
          ? { id: node.id, type: 'cell', position: node.position, data: { cellId: node.cellId } }
          : { id: node.id, type: 'source', position: node.position, data: { label: node.label } }
      ),
      edges: view.edges.map(
        ({ id, source, target, params }): Edge => ({
          id,
          source,
          target,
          label: params.length > 0 ? params.map((param) => `?${param}`).join(', ') : undefined,
          markerEnd: { type: MarkerType.ArrowClosed },
        })
      ),
    };
  }, [cells, cellOrder]);

  return (
    <div
      css={css`
        height: max(480px, calc(100vh - 280px));
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        overflow: hidden;
      `}
      data-test-subj="notebookGraph"
    >
      {nodes.length === 0 ? (
        <EuiEmptyPrompt
          iconType="graphApp"
          titleSize="xs"
          body={i18n.translate('xpack.notebook.graph.empty', {
            defaultMessage:
              'Add a query, chart or input cell to see how the cells depend on each other.',
          })}
        />
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          colorMode={colorMode === 'DARK' ? 'dark' : 'light'}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          onNodeClick={(_event, node) => {
            if (node.type === 'cell') onSelectCell(node.id);
          }}
          fitView
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      )}
    </div>
  );
};
