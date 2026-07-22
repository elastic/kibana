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
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
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
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// -- Step data --

interface ChainStep {
  id: string;
  label: string;
  type: 'rule' | 'policy' | 'workflow';
  status: 'success' | 'failed' | 'warning';
  icon: string;
  iconColor: string;
  meta: string;
}

interface SequenceStepData extends ChainStep, Record<string, unknown> {
  stepIndex: number;
  totalSteps: number;
  onClickLink?: () => void;
}

type SequenceStepNode = Node<SequenceStepData, 'sequenceStep'>;

// -- Sequence node component --

const statusBadge: Record<string, { icon: string; color: string; label: string; bg: string }> = {
  success: { icon: 'checkCircle', color: 'success', label: 'OK', bg: '#c9f3e3' },
  failed: { icon: 'error', color: 'danger', label: 'Failed', bg: '#fdddd8' },
  warning: { icon: 'warning', color: 'warning', label: 'Warning', bg: '#fde9b5' },
};

const SequenceStepComponent: React.FC<NodeProps<SequenceStepNode>> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const badge = statusBadge[data.status] ?? statusBadge.success;

  return (
    <>
      {data.stepIndex > 0 && (
        <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />
      )}
      <div
        css={css({
          width: '100%',
          height: '100%',
          background: euiTheme.colors.emptyShade,
          borderRadius: 4,
          border: `1px solid ${euiTheme.colors.lightShade}`,
          padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
          display: 'flex',
          alignItems: 'center',
          gap: euiTheme.size.s,
          pointerEvents: 'all',
        })}
      >
        <EuiIcon type={data.icon} size="m" color="subdued" css={css({ flexShrink: 0 })} />

        <div css={css({ flex: 1, minWidth: 0, overflow: 'hidden' })}>
          <EuiLink
            className="nodrag nopan"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              data.onClickLink?.();
            }}
            css={css({
              fontSize: 14,
              fontWeight: 600,
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: data.onClickLink ? 'pointer' : 'default',
              color: euiTheme.colors.title,
            })}
          >
            {data.label}
          </EuiLink>
          <EuiText
            size="xs"
            color="subdued"
            css={css({
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.3,
            })}
          >
            {data.meta}
          </EuiText>
        </div>

        <div
          css={css({
            width: 24,
            height: 24,
            borderRadius: 4,
            backgroundColor: badge.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          })}
        >
          <EuiIcon type={badge.icon} color={badge.color} size="s" />
        </div>
      </div>
      {data.stepIndex < data.totalSteps - 1 && (
        <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
      )}
    </>
  );
};

// -- Sequence edge --

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
  data,
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

// -- Chain data --

interface FailingChain {
  id: string;
  chain: string;
  steps: ChainStep[];
  sources?: ChainStep[];
  occurrences: number;
  lastSeen: string;
  status: 'failed' | 'warning';
}

const REAL_RULE_ID_1 = '377b80d5-61e5-48a1-bb0e-fc74f975b684';
const REAL_RULE_ID_2 = '4a59457f-b8bc-42ca-9bf9-6b08276912e9';
const REAL_POLICY_ID = 'f845071f-44f0-4753-be47-963ec9163b03';

const MOCK_CHAINS: FailingChain[] = [
  {
    id: '1',
    chain: 'New ESQL rule executed → Action policy to design global execution failed',
    steps: [
      {
        id: REAL_RULE_ID_1,
        label: 'New ESQL rule',
        type: 'rule',
        status: 'success',
        icon: 'bell',
        iconColor: '#0077CC',
        meta: 'ES|QL · every 1m · 23 episodes',
      },
      {
        id: REAL_POLICY_ID,
        label: 'Action policy to design global execution',
        type: 'policy',
        status: 'failed',
        icon: 'reporter',
        iconColor: '#E67300',
        meta: 'Action policy · 87 failures · last: 2m ago',
      },
    ],
    occurrences: 87,
    lastSeen: '2 min ago',
    status: 'failed',
  },
  {
    id: '2',
    chain: 'asdasf executed → Action policy to design global execution failed',
    steps: [
      {
        id: REAL_RULE_ID_2,
        label: 'asdasf',
        type: 'rule',
        status: 'success',
        icon: 'bell',
        iconColor: '#0077CC',
        meta: 'Threshold · every 5m · 8 episodes',
      },
      {
        id: REAL_POLICY_ID,
        label: 'Action policy to design global execution',
        type: 'policy',
        status: 'failed',
        icon: 'reporter',
        iconColor: '#E67300',
        meta: 'Action policy · 42 failures · last: 5m ago',
      },
    ],
    occurrences: 42,
    lastSeen: '5 min ago',
    status: 'failed',
  },
  {
    id: '3',
    chain: 'New ESQL rule executed → Action policy to design global execution dispatched to → Cleanup workflow',
    steps: [
      {
        id: REAL_RULE_ID_1,
        label: 'New ESQL rule',
        type: 'rule',
        status: 'success',
        icon: 'bell',
        iconColor: '#0077CC',
        meta: 'ES|QL · every 10m · 5 episodes',
      },
      {
        id: REAL_POLICY_ID,
        label: 'Action policy to design global execution',
        type: 'policy',
        status: 'warning',
        icon: 'reporter',
        iconColor: '#E67300',
        meta: 'Action policy · throttled · last: 12m ago',
      },
      {
        id: 'workflow-cleanup',
        label: 'Cleanup workflow',
        type: 'workflow',
        status: 'warning',
        icon: 'reporter',
        iconColor: '#00836D',
        meta: 'Workflow · pending · 31 runs',
      },
    ],
    occurrences: 31,
    lastSeen: '12 min ago',
    status: 'warning',
  },
  {
    id: '4',
    chain: 'asdasf executed → Action policy to design global execution failed',
    steps: [
      {
        id: REAL_RULE_ID_2,
        label: 'asdasf',
        type: 'rule',
        status: 'success',
        icon: 'bell',
        iconColor: '#0077CC',
        meta: 'ES|QL · every 1m · 12 episodes',
      },
      {
        id: REAL_POLICY_ID,
        label: 'Action policy to design global execution',
        type: 'policy',
        status: 'failed',
        icon: 'reporter',
        iconColor: '#E67300',
        meta: 'Action policy · 28 failures · last: 18m ago',
      },
    ],
    occurrences: 28,
    lastSeen: '18 min ago',
    status: 'failed',
  },
  {
    id: '5',
    chain: 'New ESQL rule executed → Action policy to design global execution dispatched to → Incident triage workflow',
    steps: [
      {
        id: REAL_RULE_ID_1,
        label: 'New ESQL rule',
        type: 'rule',
        status: 'success',
        icon: 'bell',
        iconColor: '#0077CC',
        meta: 'Threshold · every 5m · 3 episodes',
      },
      {
        id: REAL_POLICY_ID,
        label: 'Action policy to design global execution',
        type: 'policy',
        status: 'warning',
        icon: 'reporter',
        iconColor: '#E67300',
        meta: 'Action policy · throttled · last: 25m ago',
      },
      {
        id: 'workflow-triage',
        label: 'Incident triage workflow',
        type: 'workflow',
        status: 'warning',
        icon: 'reporter',
        iconColor: '#00836D',
        meta: 'Workflow · pending · 15 runs',
      },
    ],
    occurrences: 15,
    lastSeen: '25 min ago',
    status: 'warning',
  },
  {
    id: '6',
    chain: 'Multiple rules → Action policy to design global execution failed (fan-in)',
    sources: [
      {
        id: REAL_RULE_ID_1,
        label: 'New ESQL rule',
        type: 'rule',
        status: 'success',
        icon: 'bell',
        iconColor: '#0077CC',
        meta: 'ES|QL · every 1m · 23 episodes',
      },
      {
        id: REAL_RULE_ID_2,
        label: 'asdasf',
        type: 'rule',
        status: 'success',
        icon: 'bell',
        iconColor: '#0077CC',
        meta: 'Threshold · every 5m · 8 episodes',
      },
    ],
    steps: [
      {
        id: REAL_POLICY_ID,
        label: 'Action policy to design global execution',
        type: 'policy',
        status: 'failed',
        icon: 'reporter',
        iconColor: '#E67300',
        meta: 'Action policy · matcher: all alerts · dispatch failed',
      },
      {
        id: 'workflow-new',
        label: 'New workflow',
        type: 'workflow',
        status: 'warning',
        icon: 'reporter',
        iconColor: '#00836D',
        meta: 'Workflow · not reached · 0 runs',
      },
    ],
    occurrences: 129,
    lastSeen: '1 min ago',
    status: 'failed',
  },
];

// -- Layout --

const NODE_WIDTH = 260;
const NODE_HEIGHT = 56;
const NODE_GAP = 100;

const buildLinearGraph = (
  steps: ChainStep[],
  onRuleClick?: (ruleId: string) => void,
  onPolicyClick?: (policyId: string) => void
) => {
  const nodes: SequenceStepNode[] = steps.map((step, i) => ({
    id: `step-${i}`,
    type: 'sequenceStep',
    position: { x: i * (NODE_WIDTH + NODE_GAP), y: 0 },
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
    data: {
      ...step,
      stepIndex: i,
      totalSteps: steps.length,
      onClickLink:
        step.type === 'rule' && onRuleClick
          ? () => onRuleClick(step.id)
          : step.type === 'policy' && onPolicyClick
          ? () => onPolicyClick(step.id)
          : undefined,
    },
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const sourceStatus = steps[i].status;
    const isWarning = sourceStatus === 'warning';
    const isFailed = sourceStatus === 'failed';
    edges.push({
      id: `edge-${i}`,
      source: `step-${i}`,
      target: `step-${i + 1}`,
      type: 'sequenceArrow',
      markerEnd: isWarning ? undefined : { type: MarkerType.ArrowClosed, color: isFailed ? '#BD271E' : '#00BFB3' },
      style: {
        stroke: isFailed ? '#BD271E' : isWarning ? '#D3DAE6' : '#00BFB3',
        strokeWidth: 2,
        ...(isWarning ? { strokeDasharray: '6 4' } : {}),
      },
    });
  }

  return { nodes, edges };
};

const ROW_GAP = 24;

const buildFanInGraph = (
  sources: ChainStep[],
  targets: ChainStep[],
  onRuleClick?: (ruleId: string) => void,
  onPolicyClick?: (policyId: string) => void
) => {
  const nodes: SequenceStepNode[] = [];
  const edges: Edge[] = [];
  const sourcesHeight = sources.length * NODE_HEIGHT + (sources.length - 1) * ROW_GAP;
  const startY = -sourcesHeight / 2 + NODE_HEIGHT / 2;

  const resolveClick = (step: ChainStep) =>
    step.type === 'rule' && onRuleClick
      ? () => onRuleClick(step.id)
      : step.type === 'policy' && onPolicyClick
      ? () => onPolicyClick(step.id)
      : undefined;

  sources.forEach((step, i) => {
    nodes.push({
      id: `source-${i}`,
      type: 'sequenceStep',
      position: { x: 0, y: startY + i * (NODE_HEIGHT + ROW_GAP) },
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      data: { ...step, stepIndex: 0, totalSteps: 2, onClickLink: resolveClick(step) },
    });
  });

  targets.forEach((step, i) => {
    nodes.push({
      id: `target-${i}`,
      type: 'sequenceStep',
      position: { x: (i + 1) * (NODE_WIDTH + NODE_GAP), y: 0 },
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      data: {
        ...step,
        stepIndex: i === 0 ? 1 : i + 1,
        totalSteps: targets.length + 1,
        onClickLink: resolveClick(step),
      },
    });
  });

  // source → first target edges
  sources.forEach((source, si) => {
    const isWarning = source.status === 'warning';
    const isFailed = source.status === 'failed';
    edges.push({
      id: `edge-s${si}-t0`,
      source: `source-${si}`,
      target: `target-0`,
      type: 'sequenceArrow',
      markerEnd: isWarning ? undefined : { type: MarkerType.ArrowClosed, color: isFailed ? '#BD271E' : '#00BFB3' },
      style: {
        stroke: isFailed ? '#BD271E' : isWarning ? '#D3DAE6' : '#00BFB3',
        strokeWidth: 2,
        ...(isWarning ? { strokeDasharray: '6 4' } : {}),
      },
    });
  });

  // target chain edges (e.g. policy → workflow)
  for (let i = 0; i < targets.length - 1; i++) {
    const sourceStatus = targets[i].status;
    const isWarning = sourceStatus === 'warning';
    const isFailed = sourceStatus === 'failed';
    edges.push({
      id: `edge-t${i}-t${i + 1}`,
      source: `target-${i}`,
      target: `target-${i + 1}`,
      type: 'sequenceArrow',
      markerEnd: isWarning ? undefined : { type: MarkerType.ArrowClosed, color: isFailed ? '#BD271E' : '#00BFB3' },
      style: {
        stroke: isFailed ? '#BD271E' : isWarning ? '#D3DAE6' : '#00BFB3',
        strokeWidth: 2,
        ...(isWarning ? { strokeDasharray: '6 4' } : {}),
      },
    });
  }

  return { nodes, edges };
};

// -- AutoFit wrapper --

const AutoFitFlow: React.FC<{ nodes: SequenceStepNode[]; edges: Edge[] }> = ({ nodes, edges }) => {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.15, maxZoom: 1, duration: 0 });
    }, 50);
    return () => clearTimeout(timer);
  }, [fitView, nodes.length]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      proOptions={{ hideAttribution: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#D3DAE6" />
    </ReactFlow>
  );
};

// -- Inline sequence map --

const FailureSequenceMap: React.FC<{
  steps: ChainStep[];
  sources?: ChainStep[];
  onRuleClick?: (ruleId: string) => void;
  onPolicyClick?: (policyId: string) => void;
}> = ({ steps, sources, onRuleClick, onPolicyClick }) => {
  const { euiTheme } = useEuiTheme();
  const isFanIn = sources && sources.length > 0;
  const { nodes, edges } = useMemo(
    () =>
      isFanIn
        ? buildFanInGraph(sources, steps, onRuleClick, onPolicyClick)
        : buildLinearGraph(steps, onRuleClick, onPolicyClick),
    [steps, sources, isFanIn, onRuleClick, onPolicyClick]
  );

  const height = isFanIn
    ? Math.max(140, sources.length * NODE_HEIGHT + (sources.length - 1) * ROW_GAP + 60)
    : 140;

  return (
    <div
      css={css({
        height,
        width: '100%',
        borderRadius: euiTheme.border.radius.medium,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        border: `1px solid ${euiTheme.colors.lightShade}`,
        overflow: 'hidden',
      })}
    >
      <ReactFlowProvider>
        <AutoFitFlow nodes={nodes} edges={edges} />
      </ReactFlowProvider>
    </div>
  );
};

// -- Main component --

interface TopFailingProps {
  onRuleClick?: (ruleId: string) => void;
  onPolicyClick?: (policyId: string) => void;
}

export const TopFailing: React.FC<TopFailingProps> = ({ onRuleClick, onPolicyClick }) => {
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
        map[chain.id] = (
          <FailureSequenceMap
            steps={chain.steps}
            sources={chain.sources}
            onRuleClick={onRuleClick}
            onPolicyClick={onPolicyClick}
          />
        );
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
          defaultMessage: 'Failure path',
        }),
        render: (_chain: string, item: FailingChain) => {
          const allSteps = item.sources
            ? [...item.sources, ...item.steps]
            : item.steps;
          const sourceCount = item.sources?.length ?? 0;

          return (
            <EuiText size="s">
              <span
                css={css({
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                  rowGap: 4,
                })}
              >
                {allSteps.map((step, i) => {
                  const badge = statusBadge[step.status];
                  const showComma = item.sources && i > 0 && i < sourceCount;
                  const showArrow = i > 0 && !showComma;
                  return (
                    <React.Fragment key={`${step.id}-${i}`}>
                      {showComma && (
                        <span css={css({ color: '#69707D', marginLeft: -4 })}>,</span>
                      )}
                      {showArrow && (
                        <EuiIcon type="sortRight" size="s" color="subdued" />
                      )}
                      <span
                        css={css({
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        })}
                      >
                        {step.label}
                        {step.status !== 'success' && (
                          <span
                            css={css({
                              width: 20,
                              height: 20,
                              borderRadius: 3,
                              backgroundColor: badge.bg,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            })}
                          >
                            <EuiIcon type={badge.icon} color={badge.color} size="s" />
                          </span>
                        )}
                      </span>
                    </React.Fragment>
                  );
                })}
              </span>
            </EuiText>
          );
        },
      },
      {
        field: 'occurrences',
        name: i18n.translate('xpack.alertingV2.executionHistory.topFailing.occurrencesColumn', {
          defaultMessage: 'Failures count',
        }),
        width: '140px',
        sortable: true,
        render: (count: number) => {
          const color =
            count >= 100
              ? '#fdddd8'
              : count >= 50
              ? '#ffdebf'
              : count >= 25
              ? '#fde9b5'
              : '#cfeef7';
          return <EuiBadge color={color}>{count}</EuiBadge>;
        },
      },
      {
        field: 'lastSeen',
        name: i18n.translate('xpack.alertingV2.executionHistory.topFailing.lastSeenColumn', {
          defaultMessage: 'Last failure',
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
        items={[...MOCK_CHAINS].sort((a, b) => b.occurrences - a.occurrences)}
        itemId="id"
        columns={columns}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        tableLayout="auto"
        data-test-subj="topFailingTable"
      />
    </EuiPanel>
  );
};
