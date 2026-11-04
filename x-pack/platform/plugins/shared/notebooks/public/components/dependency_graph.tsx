/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, type CSSProperties } from 'react';
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  EuiCode,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
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
  type GetNodeWidth,
} from '../model/graph_view';
import type { CellRuntime, ParamValue } from '../model/types';
import { TYPE_ICONS, getStatusBorderColor, getTypeLabel } from './cell_display';
import { useNotebook } from './notebook_context';
import { getResultSummary } from './result_preview';

/** How a node relates to the selected node, if any. */
type Highlight = 'selected' | 'downstream' | 'dimmed' | 'none';

type CellFlowNode = Node<{ cellId: string; width: number; highlight: Highlight }, 'cell'>;
type SourceFlowNode = Node<{ label: string; width: number; highlight: Highlight }, 'source'>;
type FlowNode = CellFlowNode | SourceFlowNode;
type DependencyFlowEdge = Edge<{ params: readonly string[] }, 'dependency'>;

const EDGE_HOVER_WIDTH = 20;

const hiddenHandleCss = css`
  visibility: hidden;
`;

const NODE_MIN_WIDTH = 96;
const NODE_MAX_WIDTH = 280;
/** Horizontal padding, icon and gap around a node's text, plus slack for font rendering. */
const NODE_CHROME_WIDTH = 48;

let measureContext: CanvasRenderingContext2D | null | undefined;

const measureText = (text: string, font: string): number => {
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return NODE_MAX_WIDTH;
  measureContext.font = font;
  return measureContext.measureText(text).width;
};

const fitWidth = (textWidth: number): number =>
  Math.ceil(Math.min(NODE_MAX_WIDTH, Math.max(NODE_MIN_WIDTH, textWidth + NODE_CHROME_WIDTH)));

const useGetNodeWidth = (cells: Readonly<Record<string, CellDefinition>>): GetNodeWidth => {
  const { euiTheme } = useEuiTheme();
  return useCallback<GetNodeWidth>(
    (content) => {
      const { base, font } = euiTheme;
      const fontOf = (scale: number, weight: CSSProperties['fontWeight']) =>
        `${weight ?? ''} ${base * scale}px ${font.family}`;
      const small = fontOf(font.scale.xs, font.weight.regular);
      if (content.kind === 'source') return fitWidth(measureText(content.label, small));
      const cell = cells[content.cellId];
      if (!cell) return NODE_MIN_WIDTH;
      return fitWidth(
        Math.max(
          measureText(cell.name, fontOf(font.scale.s, font.weight.bold)),
          measureText(getTypeLabel(cell), small)
        )
      );
    },
    [cells, euiTheme]
  );
};

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

const CellNode = ({ data: { cellId, width, highlight } }: NodeProps<CellFlowNode>) => {
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
          width: ${width}px;
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
      <EuiToolTip
        content={<span css={{ whiteSpace: 'pre-line' }}>{getNodeSummary(cell, runtime)}</span>}
        position="bottom"
      >
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          tabIndex={0}
          css={{ minWidth: 0 }}
        >
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
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        css={hiddenHandleCss}
      />
    </div>
  );
};

const SourceNode = ({ data: { label, width, highlight } }: NodeProps<SourceFlowNode>) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={[
        getHighlightCss(highlight, euiTheme),
        css`
          width: ${width}px;
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

const EDGE_VARIABLES_LABEL = i18n.translate('xpack.notebook.graph.edgeVariables', {
  defaultMessage: 'Variables passed along this edge',
});

const DependencyEdgeView = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<DependencyFlowEdge>) => {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const [isHovered, setIsHovered] = useState(false);
  const params = data?.params ?? [];
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={0} />
      {params.length > 0 && (
        // Non-selectable edges get `pointer-events: none`; this path opts back in for hover.
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={EDGE_HOVER_WIDTH}
          pointerEvents="stroke"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />
      )}
      {isHovered && params.length > 0 && (
        <EdgeLabelRenderer>
          <div
            css={css`
              position: absolute;
              transform: translate(-50%, -50%) translate(${labelX}px, ${labelY}px);
              pointer-events: none;
            `}
          >
            <EuiPopover
              aria-label={EDGE_VARIABLES_LABEL}
              isOpen
              button={<span />}
              closePopover={() => {}}
              ownFocus={false}
              anchorPosition="upCenter"
              panelPaddingSize="s"
            >
              <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                {params.map((param) => (
                  <EuiFlexItem key={param} grow={false}>
                    <EuiCode transparentBackground>?{param}</EuiCode>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiPopover>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const EDGE_TYPES: EdgeTypes = { dependency: DependencyEdgeView };

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
  const [draggedPositions, setDraggedPositions] = useState<Readonly<Record<string, XYPosition>>>(
    {}
  );

  const getNodeWidth = useGetNodeWidth(cells);
  const view = useMemo(
    () => buildGraphView(cells, cellOrder, getNodeWidth),
    [cells, cellOrder, getNodeWidth]
  );

  const onNodesChange = (changes: NodeChange<FlowNode>[]) => {
    const moved = changes.flatMap((change) =>
      change.type === 'position' && change.position ? [[change.id, change.position] as const] : []
    );
    if (moved.length === 0) return;
    setDraggedPositions((current) => ({ ...current, ...Object.fromEntries(moved) }));
  };

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
        const position = draggedPositions[node.id] ?? node.position;
        return node.kind === 'cell'
          ? {
              id: node.id,
              type: 'cell',
              position,
              measured: { width: node.width, height: CELL_NODE_SIZE.height },
              data: { cellId: node.cellId, width: node.width, highlight },
            }
          : {
              id: node.id,
              type: 'source',
              position,
              measured: { width: node.width, height: SOURCE_NODE_SIZE.height },
              data: { label: node.label, width: node.width, highlight },
            };
      }),
      edges: view.edges.map(({ id, source, target, params }): DependencyFlowEdge => {
        const isHighlighted = downstream?.edges.has(id) ?? false;
        const isDimmed = downstream !== undefined && !isHighlighted;
        const color = isHighlighted ? euiTheme.colors.primary : undefined;
        return {
          id,
          source,
          target,
          type: 'dependency',
          data: { params },
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
  }, [view, selectedId, draggedPositions, euiTheme]);

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
          edgeTypes={EDGE_TYPES}
          colorMode={colorMode === 'DARK' ? 'dark' : 'light'}
          onNodesChange={onNodesChange}
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
