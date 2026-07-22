/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  ReactFlow,
  ReactFlowProvider,
  BaseEdge,
  getBezierPath,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// -- Sequence map node --

interface SequenceStepData extends Record<string, unknown> {
  label: string;
  status: 'success' | 'failed' | 'warning';
  stepIndex: number;
  totalSteps: number;
}

type SequenceStepNode = Node<SequenceStepData, 'sequenceStep'>;

const statusConfig: Record<string, { icon: string; color: string; badgeColor: string }> = {
  success: { icon: 'checkInCircleFilled', color: 'success', badgeColor: 'success' },
  failed: { icon: 'error', color: 'danger', badgeColor: 'danger' },
  warning: { icon: 'warning', color: 'warning', badgeColor: 'warning' },
};

const SequenceStepComponent: React.FC<NodeProps<SequenceStepNode>> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const config = statusConfig[data.status] ?? statusConfig.success;

  return (
    <>
      {data.stepIndex > 0 && (
        <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      )}
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="s"
        css={css({
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: euiTheme.size.s,
          borderColor: data.status === 'failed' ? euiTheme.colors.danger : undefined,
          borderWidth: data.status === 'failed' ? 2 : 1,
        })}
      >
        <EuiIcon type={config.icon} color={config.color} size="m" css={css({ flexShrink: 0 })} />
        <EuiText
          size="xs"
          css={css({
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexGrow: 1,
          })}
        >
          {data.label}
        </EuiText>
      </EuiPanel>
      {data.stepIndex < data.totalSteps - 1 && (
        <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
      )}
    </>
  );
};

// -- Sequence map edge --

const SequenceArrowEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />;
};

const nodeTypes = { sequenceStep: SequenceStepComponent };
const edgeTypes = { sequenceArrow: SequenceArrowEdge };

// -- Data --

interface ChainStep {
  label: string;
  status: 'success' | 'failed' | 'warning';
}

interface FailingChain {
  id: string;
  chain: string;
  steps: ChainStep[];
  occurrences: number;
  lastSeen: string;
  status: 'failed' | 'warning';
}

const MOCK_CHAINS: FailingChain[] = [
  {
    id: '1',
    chain: 'High CPU alert executed → Slack notifications failed',
    steps: [
      { label: 'High CPU alert', status: 'success' },
      { label: 'Slack notifications', status: 'failed' },
    ],
    occurrences: 87,
    lastSeen: '2 min ago',
    status: 'failed',
  },
  {
    id: '2',
    chain: 'Memory threshold executed → PagerDuty escalation failed',
    steps: [
      { label: 'Memory threshold', status: 'success' },
      { label: 'PagerDuty escalation', status: 'failed' },
    ],
    occurrences: 42,
    lastSeen: '5 min ago',
    status: 'failed',
  },
  {
    id: '3',
    chain: 'Disk usage monitor executed → Email digest dispatched to → Cleanup workflow',
    steps: [
      { label: 'Disk usage monitor', status: 'success' },
      { label: 'Email digest', status: 'warning' },
      { label: 'Cleanup workflow', status: 'warning' },
    ],
    occurrences: 31,
    lastSeen: '12 min ago',
    status: 'warning',
  },
  {
    id: '4',
    chain: 'Error rate spike executed → Slack notifications failed',
    steps: [
      { label: 'Error rate spike', status: 'success' },
      { label: 'Slack notifications', status: 'failed' },
    ],
    occurrences: 28,
    lastSeen: '18 min ago',
    status: 'failed',
  },
  {
    id: '5',
    chain: 'Network latency executed → PagerDuty escalation dispatched to → Incident triage workflow',
    steps: [
      { label: 'Network latency', status: 'success' },
      { label: 'PagerDuty escalation', status: 'warning' },
      { label: 'Incident triage workflow', status: 'warning' },
    ],
    occurrences: 15,
    lastSeen: '25 min ago',
    status: 'warning',
  },
];

// -- Layout --

const NODE_WIDTH = 200;
const NODE_HEIGHT = 44;
const NODE_GAP = 120;

const buildGraph = (steps: ChainStep[]) => {
  const nodes: SequenceStepNode[] = steps.map((step, i) => ({
    id: `step-${i}`,
    type: 'sequenceStep',
    position: { x: i * (NODE_WIDTH + NODE_GAP), y: 0 },
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
    data: { label: step.label, status: step.status, stepIndex: i, totalSteps: steps.length },
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    edges.push({
      id: `edge-${i}`,
      source: `step-${i}`,
      target: `step-${i + 1}`,
      type: 'sequenceArrow',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        stroke: steps[i + 1].status === 'failed' ? '#BD271E' : '#98A2B3',
        strokeWidth: 2,
      },
    });
  }

  return { nodes, edges };
};

// -- AutoFit wrapper --

const AutoFitFlow: React.FC<{ nodes: SequenceStepNode[]; edges: Edge[] }> = ({ nodes, edges }) => {
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, maxZoom: 1, duration: 0 });
    }, 50);
    return () => clearTimeout(timer);
  }, [fitView, nodes.length]);

  return (
    <div ref={containerRef} css={css({ width: '100%', height: '100%' })}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

// -- Inline sequence map --

const FailureSequenceMap: React.FC<{ steps: ChainStep[] }> = ({ steps }) => {
  const { euiTheme } = useEuiTheme();
  const { nodes, edges } = useMemo(() => buildGraph(steps), [steps]);

  return (
    <div
      css={css({
        height: 120,
        width: '100%',
        borderRadius: euiTheme.border.radius.medium,
        background: euiTheme.colors.backgroundBasePlain,
        border: `1px solid ${euiTheme.colors.lightShade}`,
      })}
    >
      <ReactFlowProvider>
        <AutoFitFlow nodes={nodes} edges={edges} />
      </ReactFlowProvider>
    </div>
  );
};

// -- Main component --

export const TopFailing: React.FC = () => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const itemIdToExpandedRowMap = useMemo(() => {
    const map: Record<string, React.ReactNode> = {};
    for (const chain of MOCK_CHAINS) {
      if (expandedIds.has(chain.id)) {
        map[chain.id] = <FailureSequenceMap steps={chain.steps} />;
      }
    }
    return map;
  }, [expandedIds]);

  const columns: Array<EuiBasicTableColumn<FailingChain>> = useMemo(
    () => [
      {
        field: 'id',
        name: '',
        width: '40px',
        render: (id: string) => (
          <EuiButtonIcon
            iconType={expandedIds.has(id) ? 'arrowDown' : 'arrowRight'}
            aria-label={expandedIds.has(id) ? 'Collapse sequence map' : 'Expand sequence map'}
            onClick={() => toggleRow(id)}
            size="xs"
            color="text"
          />
        ),
      },
      {
        field: 'chain',
        name: i18n.translate('xpack.alertingV2.executionHistory.topFailing.chainColumn', {
          defaultMessage: 'Execution chain',
        }),
        render: (chain: string, item: FailingChain) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon
                type={item.status === 'failed' ? 'error' : 'warning'}
                color={item.status === 'failed' ? 'danger' : 'warning'}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">{chain}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'occurrences',
        name: i18n.translate('xpack.alertingV2.executionHistory.topFailing.occurrencesColumn', {
          defaultMessage: 'Occurrences',
        }),
        width: '120px',
        render: (count: number) => (
          <EuiBadge color={count > 50 ? 'danger' : 'warning'}>{count}</EuiBadge>
        ),
      },
      {
        field: 'lastSeen',
        name: i18n.translate('xpack.alertingV2.executionHistory.topFailing.lastSeenColumn', {
          defaultMessage: 'Last seen',
        }),
        width: '120px',
      },
    ],
    [expandedIds, toggleRow]
  );

  return (
    <EuiPanel hasBorder data-test-subj="topFailingPanel">
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.alertingV2.executionHistory.topFailing.title', {
            defaultMessage: 'Top failing',
          })}
        </h3>
      </EuiTitle>

      <EuiBasicTable<FailingChain>
        items={MOCK_CHAINS}
        itemId="id"
        columns={columns}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        tableLayout="auto"
        data-test-subj="topFailingTable"
      />
    </EuiPanel>
  );
};
