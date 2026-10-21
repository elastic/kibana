/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, type ReactNode } from 'react';
import type { IconType } from '@elastic/eui';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Edge, Node, NodeProps } from '@xyflow/react';
import {
  Background,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { PipelineStep, PipelineStepId } from './build_pipeline_steps';

const BASE_NODE_WIDTH = 280;
const STEP_NODE_WIDTH = 180;
const NODE_HEIGHT = 52;
/** Tall enough for Base → Alert → Recovery → No-data stacked vertically. */
const COMPACT_MAP_HEIGHT = 420;

const STEP_ICONS: Record<PipelineStepId, IconType> = {
  base: 'document',
  alert: 'warning',
  recovery: 'refresh',
  noData: 'eye',
};

/** Steps on the primary lifecycle path (Base → Alert → Recovery). */
const MAIN_PATH: PipelineStepId[] = ['base', 'alert', 'recovery'];

const isOnActivePath = (stepId: PipelineStepId, activeId: PipelineStepId): boolean => {
  if (activeId === 'noData') {
    return stepId === 'base' || stepId === 'noData';
  }
  const activeIdx = MAIN_PATH.indexOf(activeId);
  const stepIdx = MAIN_PATH.indexOf(stepId);
  return stepIdx !== -1 && stepIdx <= activeIdx;
};

interface PipelineNodeData extends Record<string, unknown> {
  step: PipelineStep;
  isOnPath: boolean;
  isBase: boolean;
}

type PipelineFlowNode = Node<PipelineNodeData, 'pipelineStep'>;

const PipelineStepNode = ({ data, selected }: NodeProps<PipelineFlowNode>) => {
  const { euiTheme } = useEuiTheme();
  const { step, isOnPath, isBase } = data;
  const width = isBase ? BASE_NODE_WIDTH : STEP_NODE_WIDTH;

  return (
    <div
      data-test-subj={`queryPipelineStep-${step.id}`}
      role="button"
      aria-pressed={selected}
      tabIndex={0}
      css={css`
        inline-size: ${width}px;
        min-block-size: ${NODE_HEIGHT}px;
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.m};
        padding: ${euiTheme.size.m};
        background: ${euiTheme.colors.backgroundBasePlain};
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
        border-radius: ${euiTheme.border.radius.medium};
        cursor: pointer;
        opacity: ${isOnPath || selected ? 1 : 0.55};
        outline: ${selected
          ? `${euiTheme.border.width.thick} solid ${euiTheme.colors.primary}`
          : 'none'};
        outline-offset: 2px;
        box-sizing: border-box;
      `}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div
        css={css`
          inline-size: 28px;
          block-size: 28px;
          border-radius: ${euiTheme.border.radius.medium};
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: ${selected || isOnPath
            ? euiTheme.colors.backgroundLightPrimary
            : euiTheme.colors.backgroundBaseSubdued};
          border: ${euiTheme.border.width.thin} solid
            ${selected || isOnPath
              ? euiTheme.colors.borderBasePrimary
              : euiTheme.colors.borderBaseSubdued};
        `}
      >
        <EuiIcon
          type={STEP_ICONS[step.id]}
          size="m"
          color={selected || isOnPath ? 'primary' : 'subdued'}
        />
      </div>
      <div css={css`min-inline-size: 0; flex: 1;`}>
        <EuiText size={isBase ? 's' : 'xs'}>
          <strong
            css={css`
              display: block;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              color: ${euiTheme.colors.textHeading};
            `}
          >
            {step.title}
          </strong>
        </EuiText>
        {isBase ? (
          <EuiText size="xs" color="subdued">
            <span
              css={css`
                display: block;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            >
              {step.when}
            </span>
          </EuiText>
        ) : null}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      {isBase ? (
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{ opacity: 0, top: '70%' }}
        />
      ) : null}
      {step.id === 'noData' ? (
        <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      ) : null}
    </div>
  );
};

const nodeTypes = { pipelineStep: PipelineStepNode };

const buildGraph = (
  steps: PipelineStep[],
  activeId: PipelineStepId,
  edgeStroke: string,
  edgeStrokeActive: string
): { nodes: PipelineFlowNode[]; edges: Edge[] } => {
  const byId = new Map(steps.map((step) => [step.id, step]));

  // Vertical path: Base → Alert → Recovery → No-data.
  // No-data sits below Recovery but its edge still originates from Base
  // (right handle → left handle), curving around the main column.
  const baseX = 40;
  const stepX = baseX + (BASE_NODE_WIDTH - STEP_NODE_WIDTH) / 2;

  const positions: Record<PipelineStepId, { x: number; y: number }> = {
    base: { x: baseX, y: 24 },
    alert: { x: stepX, y: 120 },
    recovery: { x: stepX, y: 220 },
    noData: { x: stepX, y: 320 },
  };

  const ordered: PipelineStepId[] = ['base', 'alert', 'recovery', 'noData'];

  const nodes: PipelineFlowNode[] = ordered.flatMap((id) => {
    const step = byId.get(id);
    if (!step) {
      return [];
    }
    const isBase = id === 'base';
    const width = isBase ? BASE_NODE_WIDTH : STEP_NODE_WIDTH;
    return [
      {
        id,
        type: 'pipelineStep' as const,
        position: positions[id],
        selected: activeId === id,
        draggable: false,
        selectable: true,
        style: { width, height: isBase ? 64 : NODE_HEIGHT },
        data: {
          step,
          isOnPath: isOnActivePath(id, activeId),
          isBase,
        },
      },
    ];
  });

  const alertPathActive = isOnActivePath('alert', activeId);
  const recoveryPathActive = isOnActivePath('recovery', activeId);
  const noDataPathActive = activeId === 'noData';

  const edge = (
    id: string,
    source: PipelineStepId,
    target: PipelineStepId,
    active: boolean,
    extras?: Partial<Edge>
  ): Edge => ({
    id,
    source,
    target,
    type: 'smoothstep',
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: active ? edgeStrokeActive : edgeStroke,
    },
    style: {
      stroke: active ? edgeStrokeActive : edgeStroke,
      strokeWidth: active ? 2 : 1.5,
      opacity: active ? 1 : 0.45,
    },
    ...extras,
  });

  const edges: Edge[] = [
    edge('base->alert', 'base', 'alert', alertPathActive || recoveryPathActive),
    edge('alert->recovery', 'alert', 'recovery', recoveryPathActive),
    edge('base->noData', 'base', 'noData', noDataPathActive, {
      sourceHandle: 'right',
      targetHandle: 'left',
    }),
  ];

  return { nodes, edges };
};

const PipelineMapCanvas = ({
  steps,
  activeId,
  onSelect,
  detail,
  fullHeight,
}: {
  steps: PipelineStep[];
  activeId: PipelineStepId;
  onSelect: (id: PipelineStepId) => void;
  detail?: ReactNode;
  fullHeight?: boolean;
}): React.ReactElement => {
  const { euiTheme, colorMode } = useEuiTheme();

  const { nodes, edges } = useMemo(
    () =>
      buildGraph(
        steps,
        activeId,
        euiTheme.colors.borderBaseSubdued,
        euiTheme.colors.borderBasePrimary
      ),
    [steps, activeId, euiTheme.colors.borderBaseSubdued, euiTheme.colors.borderBasePrimary]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelect(node.id as PipelineStepId);
    },
    [onSelect]
  );

  return (
    <div
      data-test-subj="queryPipelineMap"
      css={css`
        ${fullHeight
          ? `
          flex: 1 1 auto;
          min-block-size: 360px;
          block-size: 100%;
        `
          : `block-size: ${COMPACT_MAP_HEIGHT}px;`}
        border-radius: ${euiTheme.border.radius.medium};
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
        overflow: hidden;
        position: relative;
        .react-flow__node {
          cursor: pointer;
        }
        .react-flow__attribution {
          display: none;
        }
      `}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        colorMode={colorMode === 'DARK' ? 'dark' : 'light'}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background
          bgColor={euiTheme.colors.backgroundBaseSubdued}
          color={euiTheme.colors.borderBasePlain}
          gap={16}
          size={1}
        />
        {detail ? (
          <Panel
            position="top-right"
            css={css`
              margin: ${euiTheme.size.m} !important;
              inline-size: min(640px, 56%);
              max-block-size: calc(100% - ${euiTheme.size.xl});
              overflow: auto;
              background: ${euiTheme.colors.backgroundBasePlain};
              border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
              border-radius: ${euiTheme.border.radius.medium};
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              padding: ${euiTheme.size.m};
            `}
            data-test-subj="queryPipelineDetailPanel"
          >
            {detail}
          </Panel>
        ) : null}
      </ReactFlow>
    </div>
  );
};

/**
 * Pipeline map (React Flow): Base → Alert → Recovery → No-data stacked vertically,
 * with the No-data edge still sourced from Base (curves around the main column).
 * Optional detail panel docks top-right like the Workflows graph inspector.
 */
export const PipelineMap = (props: {
  steps: PipelineStep[];
  activeId: PipelineStepId;
  onSelect: (id: PipelineStepId) => void;
  detail?: ReactNode;
  fullHeight?: boolean;
}): React.ReactElement => (
  <ReactFlowProvider>
    <PipelineMapCanvas {...props} />
  </ReactFlowProvider>
);
