/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  useStore,
  type EdgeTypes,
  type NodeChange,
  type NodeMouseHandler,
  type NodeTypes,
  type ReactFlowState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import { SubjectList } from '../../subjects/attachments/subject_view';
import { HypothesisDetail } from '../attachments/hypotheses_view';
import { confidenceLabel } from '../attachments/translations';
import { ProposalDecision } from './proposal_decision';
import {
  buildHypothesisGraph,
  getPathToNode,
  HYPOTHESIS_TREE_NODE_IDS,
  type HypothesisTreeInput,
  type HypothesisTreeNodeData,
} from './build_hypothesis_graph';
import {
  HYPOTHESIS_TREE_ESTIMATED_NODE_HEIGHT,
  layoutHypothesisGraph,
} from './layout_hypothesis_graph';
import {
  HypothesisStatusBadge,
  HypothesisTreeActionsContext,
  HypothesisTreeNode,
  type HypothesisTreeFlowNode,
} from './hypothesis_tree_nodes';
import { HypothesisTreeEdge, type HypothesisTreeFlowEdge } from './hypothesis_tree_edge';
import {
  CLOSE_DETAILS_LABEL,
  FIT_VIEW_LABEL,
  HYPOTHESIS_TREE_TITLE,
  INVESTIGATING_LABEL,
  NODE_LABELS,
  hypothesesAnalyzedLabel,
} from './translations';

const nodeTypes: NodeTypes = { hypothesisTree: HypothesisTreeNode };
const edgeTypes: EdgeTypes = { hypothesisTree: HypothesisTreeEdge };

const FIT_VIEW_OPTIONS = { padding: 0.08, maxZoom: 1, duration: 300 } as const;
const DETAIL_PANEL_WIDTH = 380;
/** Gap React Flow's `Panel` leaves between the detail panel and the canvas edge. */
const DETAIL_PANEL_MARGIN = 15;
const CENTRE_DURATION_MS = 300;
const DIMMED_OPACITY = 0.45;

const selectCanvasWidth = ({ width }: ReactFlowState): number => width;
const selectCanvasHeight = ({ height }: ReactFlowState): number => height;

export interface HypothesisTreeFlyoutProps {
  input: HypothesisTreeInput;
  onClose: () => void;
}

const getDetailTitle = (data: HypothesisTreeNodeData): string => {
  switch (data.kind) {
    case 'trigger':
      return NODE_LABELS.trigger;
    case 'hypothesis':
      return data.hypothesis.candidate;
    case 'conclusion':
      return NODE_LABELS.conclusion;
    case 'actions':
      return NODE_LABELS.proposedAction;
    case 'hypotheses':
      return '';
    default: {
      const exhaustive: never = data;
      throw new Error(`Unhandled hypothesis tree node: ${JSON.stringify(exhaustive)}`);
    }
  }
};

const NodeDetail = ({
  investigationId,
  data,
  selectedActionIndex,
}: {
  investigationId: string;
  data: HypothesisTreeNodeData;
  selectedActionIndex: number | null;
}): React.ReactElement | null => {
  switch (data.kind) {
    case 'trigger':
      return data.subjects.length > 0 ? (
        <SubjectList subjects={[...data.subjects]} />
      ) : (
        <EuiText size="s">
          <p>{data.title}</p>
        </EuiText>
      );
    case 'hypothesis': {
      const { status, confidence, reason, evidence } = data.hypothesis;
      return (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <HypothesisStatusBadge status={status} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {confidenceLabel(confidence)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <HypothesisDetail reason={reason} evidence={evidence} />
        </>
      );
    }
    case 'conclusion':
      return <EuiMarkdownFormat textSize="s">{data.conclusion}</EuiMarkdownFormat>;
    case 'actions': {
      const { id } = data.proposals[Math.min(selectedActionIndex ?? 0, data.proposals.length - 1)];
      return <ProposalDecision key={id} investigationId={investigationId} proposalId={id} />;
    }
    case 'hypotheses':
      return null;
    default: {
      const exhaustive: never = data;
      throw new Error(`Unhandled hypothesis tree node: ${JSON.stringify(exhaustive)}`);
    }
  }
};

const HypothesisTreeCanvas = ({ input }: { input: HypothesisTreeInput }): React.ReactElement => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { fitView, getZoom, setCenter } = useReactFlow();
  const canvasWidth = useStore(selectCanvasWidth);
  const canvasHeight = useStore(selectCanvasHeight);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const [nodes, setNodes, onNodesChange] = useNodesState<HypothesisTreeFlowNode>([]);
  const { isRunning } = input;

  const graph = useMemo(() => buildHypothesisGraph(input), [input]);
  const positioned = useMemo(
    () => layoutHypothesisGraph(graph, measuredHeights),
    [graph, measuredHeights]
  );

  const selectedNode = graph.nodes.find(({ id }) => id === selectedNodeId);
  const selectedPath = useMemo(
    () => (selectedNode ? getPathToNode(graph.edges, selectedNode.id) : undefined),
    [graph.edges, selectedNode]
  );

  useEffect(() => {
    // Spread the previous node so React Flow keeps its measured size instead of re-measuring.
    setNodes((previous) => {
      const previousById = new Map(previous.map((node) => [node.id, node]));
      return positioned.map(({ id, data, position }) => ({
        ...previousById.get(id),
        id,
        type: 'hypothesisTree' as const,
        position,
        draggable: false,
        connectable: false,
        data: {
          ...data,
          isSelected: id === selectedNode?.id,
          isDimmed: selectedPath !== undefined && !selectedPath.nodeIds.has(id),
          selectedActionIndex:
            id === HYPOTHESIS_TREE_NODE_IDS.actions && id === selectedNode?.id
              ? selectedActionIndex
              : null,
        },
      }));
    });
  }, [positioned, selectedActionIndex, selectedNode?.id, selectedPath, setNodes]);

  const edges = useMemo<HypothesisTreeFlowEdge[]>(
    () =>
      graph.edges.map(({ id, source, target, isHappyPath }) => {
        const isHighlighted = selectedPath?.edgeIds.has(id) ?? false;
        const stroke = isHappyPath
          ? euiTheme.colors.borderStrongSuccess
          : isHighlighted
          ? euiTheme.colors.borderStrongPrimary
          : euiTheme.colors.borderBaseProminent;
        return {
          id,
          source,
          target,
          type: 'hypothesisTree',
          animated: isRunning,
          zIndex: 0,
          style: {
            stroke,
            strokeWidth: isHappyPath || isHighlighted ? 2 : 1.5,
            opacity: selectedPath && !isHighlighted ? DIMMED_OPACITY : 1,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 },
        };
      }),
    [euiTheme.colors, graph.edges, isRunning, selectedPath]
  );

  const handleNodesChange = useCallback(
    (changes: Array<NodeChange<HypothesisTreeFlowNode>>) => {
      onNodesChange(changes);
      const measured: Record<string, number> = {};
      changes.forEach((change) => {
        if (change.type === 'dimensions' && change.dimensions) {
          measured[change.id] = change.dimensions.height;
        }
      });
      if (Object.keys(measured).length === 0) {
        return;
      }
      setMeasuredHeights((previous) =>
        Object.entries(measured).every(([id, height]) => Math.abs((previous[id] ?? 0) - height) < 1)
          ? previous
          : { ...previous, ...measured }
      );
    },
    [onNodesChange]
  );

  const layoutKey = `${graph.nodes.map(({ id }) => id).join('|')}#${JSON.stringify(
    measuredHeights
  )}`;
  useEffect(() => {
    // Waits for React Flow to measure the new nodes before fitting them. Also refits when the
    // flyout is resized, so no node is left out of view.
    void fitView(FIT_VIEW_OPTIONS);
  }, [layoutKey, canvasWidth, canvasHeight, fitView]);

  const fitAll = useCallback(() => void fitView(FIT_VIEW_OPTIONS), [fitView]);

  const centreOnNode = useCallback(
    (nodeId: string) => {
      const node = positioned.find(({ id }) => id === nodeId);
      if (!node) {
        return;
      }
      const zoom = getZoom();
      const height =
        measuredHeights[nodeId] ?? HYPOTHESIS_TREE_ESTIMATED_NODE_HEIGHT[node.data.kind];
      // The detail panel overlays the left of the canvas, so centre in the strip to its right when
      // the canvas is wide enough to leave one; otherwise centre on the whole canvas.
      const panelSpace = DETAIL_PANEL_WIDTH + DETAIL_PANEL_MARGIN;
      const hasFreeStrip = canvasWidth - panelSpace >= node.width * zoom + DETAIL_PANEL_MARGIN * 2;
      const detailPanelOffset = hasFreeStrip ? panelSpace / 2 / zoom : 0;
      void setCenter(
        node.position.x + node.width / 2 - detailPanelOffset,
        node.position.y + height / 2,
        { zoom, duration: CENTRE_DURATION_MS }
      );
    },
    [canvasWidth, getZoom, measuredHeights, positioned, setCenter]
  );

  // Selecting a node centres it beside the detail panel; closing the panel shows the whole tree again.
  const clearSelection = useCallback(() => {
    if (selectedNodeId === null) {
      return;
    }
    setSelectedNodeId(null);
    setSelectedActionIndex(null);
    void fitView(FIT_VIEW_OPTIONS);
  }, [fitView, selectedNodeId]);

  const selectNode = useCallback(
    (id: string) => {
      const node = graph.nodes.find((candidate) => candidate.id === id);
      // The hypotheses chip only summarizes the row below it.
      if (!node || node.data.kind === 'hypotheses') {
        return;
      }
      if (selectedNodeId === id) {
        clearSelection();
        return;
      }
      setSelectedNodeId(id);
      setSelectedActionIndex(node.data.kind === 'actions' ? 0 : null);
      centreOnNode(id);
    },
    [centreOnNode, clearSelection, graph.nodes, selectedNodeId]
  );

  const handleNodeClick: NodeMouseHandler<HypothesisTreeFlowNode> = useCallback(
    (_, { id }) => selectNode(id),
    [selectNode]
  );

  const actionsContext = useMemo(
    () => ({
      onSelectNode: selectNode,
      onSelectAction: (index: number) => {
        if (selectedNodeId === HYPOTHESIS_TREE_NODE_IDS.actions && selectedActionIndex === index) {
          clearSelection();
          return;
        }
        if (selectedNodeId !== HYPOTHESIS_TREE_NODE_IDS.actions) {
          centreOnNode(HYPOTHESIS_TREE_NODE_IDS.actions);
        }
        setSelectedNodeId(HYPOTHESIS_TREE_NODE_IDS.actions);
        setSelectedActionIndex(index);
      },
    }),
    [centreOnNode, clearSelection, selectNode, selectedActionIndex, selectedNodeId]
  );

  return (
    <HypothesisTreeActionsContext.Provider value={actionsContext}>
      <ReactFlow<HypothesisTreeFlowNode, HypothesisTreeFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={clearSelection}
        nodesDraggable={false}
        nodesConnectable={false}
        // The nodes that open details are buttons themselves, so React Flow's own focusable node
        // wrapper would only add a second tab stop that Enter and Space do nothing on.
        nodesFocusable={false}
        elementsSelectable={false}
        minZoom={0.2}
        maxZoom={1}
        colorMode={colorMode === 'DARK' ? 'dark' : 'light'}
        proOptions={{ hideAttribution: true }}
        data-test-subj="investigationHypothesisTreeCanvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          bgColor={euiTheme.colors.backgroundBaseSubdued}
          color={euiTheme.colors.borderBaseProminent}
          gap={16}
          size={1}
        />
        <Controls showInteractive={false} showFitView={false} position="bottom-right">
          <ControlButton
            onClick={fitAll}
            title={FIT_VIEW_LABEL}
            aria-label={FIT_VIEW_LABEL}
            data-test-subj="investigationHypothesisTreeFitView"
          >
            <EuiIcon type="bullseye" size="s" aria-hidden={true} />
          </ControlButton>
        </Controls>
        {isRunning && (
          <Panel position="top-right">
            <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">{INVESTIGATING_LABEL}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </Panel>
        )}
        {selectedNode && selectedNode.data.kind !== 'hypotheses' && (
          <Panel position="top-left">
            <EuiPanel
              hasShadow
              paddingSize="m"
              data-test-subj="investigationHypothesisTreeDetail"
              css={css`
                width: ${DETAIL_PANEL_WIDTH}px;
                max-height: calc(100vh - ${euiTheme.size.xxxxl} * 4);
                overflow-y: auto;
              `}
            >
              <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h3>{getDetailTitle(selectedNode.data)}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={CLOSE_DETAILS_LABEL} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="cross"
                      color="text"
                      aria-label={CLOSE_DETAILS_LABEL}
                      onClick={clearSelection}
                      data-test-subj="investigationHypothesisTreeDetailClose"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <NodeDetail
                investigationId={input.id}
                data={selectedNode.data}
                selectedActionIndex={selectedActionIndex}
              />
            </EuiPanel>
          </Panel>
        )}
      </ReactFlow>
    </HypothesisTreeActionsContext.Provider>
  );
};

/**
 * Draws the investigation as a hypothesis tree in a push flyout. It opens as a new main flyout in
 * the conversation details flyout's history group, so the flyout menu offers Back to it, and as a
 * push flyout it leaves the chat beside it visible.
 */
export const HypothesisTreeFlyout = ({
  input,
  onClose,
}: HypothesisTreeFlyoutProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'investigationHypothesisTreeTitle' });

  return (
    // Rendered from inside the conversation details flyout, whose transformed body would otherwise
    // contain this fixed-position flyout.
    <EuiPortal>
      <EuiFlyout
        onClose={onClose}
        aria-labelledby={titleId}
        data-test-subj="investigationHypothesisTreeFlyout"
        session="start"
        historyKey={CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY}
        flyoutMenuProps={{ title: HYPOTHESIS_TREE_TITLE, hideTitle: true }}
        type="push"
        size="m"
        resizable
      >
        <EuiFlyoutHeader>
          <EuiTitle size="s">
            <h2 id={titleId}>{HYPOTHESIS_TREE_TITLE}</h2>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            {hypothesesAnalyzedLabel(input.hypotheses.length)}
          </EuiText>
        </EuiFlyoutHeader>
        <div
          css={css`
            flex: 1 1 auto;
            min-block-size: 0;
            position: relative;
            margin: ${euiTheme.size.base};
            border: ${euiTheme.border.thin};
            border-radius: ${euiTheme.border.radius.medium};
            overflow: hidden;
          `}
        >
          <ReactFlowProvider>
            <HypothesisTreeCanvas input={input} />
          </ReactFlowProvider>
        </div>
      </EuiFlyout>
    </EuiPortal>
  );
};
