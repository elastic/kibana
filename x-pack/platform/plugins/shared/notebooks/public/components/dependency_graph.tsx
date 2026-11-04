/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
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
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CellDefinition } from '../../common/types';
import {
  buildGraphView,
  CELL_NODE_SIZE,
  getDownstream,
  SOURCE_NODE_SIZE,
} from '../model/graph_view';
import type { CellRuntime, ParamValue } from '../model/types';
import { TYPE_ICONS, getStatusBorderColor, getTypeLabel } from './cell_display';
import { CellStatusBadge } from './cell_status_badge';
import { useNotebook } from './notebook_context';
import { getResultSummary } from './result_preview';

/** How a node relates to the selected node, if any. */
type Highlight = 'selected' | 'downstream' | 'dimmed' | 'none';

type CellFlowNode = Node<{ cellId: string; highlight: Highlight }, 'cell'>;
type SourceFlowNode = Node<{ label: string; highlight: Highlight }, 'source'>;
type FlowNode = CellFlowNode | SourceFlowNode;

const hiddenHandleCss = css`
  visibility: hidden;
`;

const DIMMED_OPACITY = 0.35;

const getHighlightCss = (highlight: Highlight, { colors, border }: UseEuiTheme['euiTheme']) => css`
  opacity: ${highlight === 'dimmed' ? DIMMED_OPACITY : 1};
  outline: ${highlight === 'selected' ? `${border.width.thick} solid ${colors.primary}` : 'none'};
  outline-offset: 2px;
  transition: opacity 150ms;
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

const CellNode = ({ data: { cellId, highlight } }: NodeProps<CellFlowNode>) => {
  const { store } = useNotebook();
  const { euiTheme } = useEuiTheme();
  const cells = useStateFromPublishingSubject(store.cells$);
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cellId));
  const cell = cells[cellId];
  if (!cell) return null;

  return (
    <div
      css={[
        getHighlightCss(highlight, euiTheme),
        css`
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
        `,
      ]}
      data-test-subj={`notebookGraphNode-${cell.name}`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} css={hiddenHandleCss} />
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
        {cell.type !== 'markdown' && runtime.status !== 'done' && (
          <EuiFlexItem grow={false}>
            <CellStatusBadge runtime={runtime} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        css={hiddenHandleCss}
      />
    </div>
  );
};

const SourceNode = ({ data: { label, highlight } }: NodeProps<SourceFlowNode>) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={[
        getHighlightCss(highlight, euiTheme),
        css`
          width: ${SOURCE_NODE_SIZE.width}px;
          height: ${SOURCE_NODE_SIZE.height}px;
          display: flex;
          align-items: center;
          padding: 0 ${euiTheme.size.s};
          background: ${euiTheme.colors.backgroundBaseSubdued};
          border: ${euiTheme.border.width.thin} dashed ${euiTheme.border.color};
          border-radius: ${euiTheme.border.radius.medium};
          cursor: pointer;
        `,
      ]}
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
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        css={hiddenHandleCss}
      />
    </div>
  );
};

const NODE_TYPES: NodeTypes = { cell: CellNode, source: SourceNode };

/** The notebook's cells and data sources as a top-to-bottom dependency graph. */
export const DependencyGraph = ({
  onSelectCell,
}: {
  onSelectCell: (cellId: string | undefined) => void;
}) => {
  const { store } = useNotebook();
  const { euiTheme, colorMode } = useEuiTheme();
  const cells = useStateFromPublishingSubject(store.cells$);
  const cellOrder = useStateFromPublishingSubject(store.cellOrder$);
  const [selectedId, setSelectedId] = useState<string>();

  const view = useMemo(() => buildGraphView(cells, cellOrder), [cells, cellOrder]);

  const { nodes, edges } = useMemo(() => {
    const selected = view.nodes.some(({ id }) => id === selectedId) ? selectedId : undefined;
    const downstream = selected ? getDownstream(view.edges, selected) : undefined;
    const getHighlight = (id: string): Highlight => {
      if (!downstream) return 'none';
      if (id === selected) return 'selected';
      return downstream.nodes.has(id) ? 'downstream' : 'dimmed';
    };
    return {
      nodes: view.nodes.map((node): FlowNode => {
        const highlight = getHighlight(node.id);
        return node.kind === 'cell'
          ? {
              id: node.id,
              type: 'cell',
              position: node.position,
              data: { cellId: node.cellId, highlight },
            }
          : {
              id: node.id,
              type: 'source',
              position: node.position,
              data: { label: node.label, highlight },
            };
      }),
      edges: view.edges.map(({ id, source, target, params }): Edge => {
        const isHighlighted = downstream?.edges.has(id) ?? false;
        const isDimmed = downstream !== undefined && !isHighlighted;
        const color = isHighlighted ? euiTheme.colors.primary : undefined;
        return {
          id,
          source,
          target,
          label: params.length > 0 ? params.map((param) => `?${param}`).join(', ') : undefined,
          markerEnd: { type: MarkerType.ArrowClosed, color },
          animated: isHighlighted,
          zIndex: isHighlighted ? 1 : 0,
          style: {
            stroke: color,
            strokeWidth: isHighlighted ? 2 : 1,
            opacity: isDimmed ? DIMMED_OPACITY : 1,
          },
        };
      }),
    };
  }, [view, selectedId, euiTheme]);

  return (
    <div
      css={css`
        height: 100%;
        overflow: hidden;
      `}
      data-test-subj="notebookGraph"
    >
      {nodes.length === 0 ? (
        <EuiEmptyPrompt
          iconType="graphApp"
          titleSize="xs"
          body={i18n.translate('xpack.notebook.graph.empty', {
            defaultMessage: 'Add cells to see how they depend on each other.',
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
            setSelectedId(node.id);
            onSelectCell(node.type === 'cell' ? node.id : undefined);
          }}
          onPaneClick={() => {
            setSelectedId(undefined);
            onSelectCell(undefined);
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
