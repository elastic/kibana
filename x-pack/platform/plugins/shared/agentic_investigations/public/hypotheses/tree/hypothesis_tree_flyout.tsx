/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import {
  EuiBadge,
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
import { EvidenceView } from '../../evidence/evidence_view';
import { SubjectList } from '../../subjects/attachments/subject_view';
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
  ENTER_FULL_SCREEN_LABEL,
  EXIT_FULL_SCREEN_LABEL,
  FIT_VIEW_LABEL,
  HYPOTHESIS_TREE_TITLE,
  INVESTIGATING_LABEL,
  NEXT_ACTION_LABEL,
  NODE_LABELS,
  NO_COMMENT_LABEL,
  NO_REASON_LABEL,
  PREVIOUS_ACTION_LABEL,
  PROPOSAL_CONFIDENCE_LABELS,
  PROPOSAL_STATUS_LABELS,
  actionPositionLabel,
  hypothesesAnalyzedLabel,
  hypothesisConfidenceLabel,
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

const ActionPager = ({
  index,
  total,
  onChange,
}: {
  index: number;
  total: number;
  onChange: (index: number) => void;
}): React.ReactElement => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent="flexEnd"
    gutterSize="xs"
    responsive={false}
    data-test-subj="investigationHypothesisTreeActionPager"
  >
    <EuiFlexItem grow={false}>
      <EuiToolTip content={PREVIOUS_ACTION_LABEL} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="chevronSingleLeft"
          color="text"
          aria-label={PREVIOUS_ACTION_LABEL}
          isDisabled={index === 0}
          onClick={() => onChange(index - 1)}
          data-test-subj="investigationHypothesisTreeActionPrevious"
        />
      </EuiToolTip>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs">{actionPositionLabel(index + 1, total)}</EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiToolTip content={NEXT_ACTION_LABEL} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="chevronSingleRight"
          color="text"
          aria-label={NEXT_ACTION_LABEL}
          isDisabled={index === total - 1}
          onClick={() => onChange(index + 1)}
          data-test-subj="investigationHypothesisTreeActionNext"
        />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const NodeDetail = ({
  investigationId,
  data,
  selectedActionIndex,
  onChangeAction,
}: {
  investigationId: string;
  data: HypothesisTreeNodeData;
  selectedActionIndex: number | null;
  onChangeAction: (index: number) => void;
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
      const { status, confidence, reason, evidence = [] } = data.hypothesis;
      return (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <HypothesisStatusBadge status={status} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {hypothesisConfidenceLabel(confidence)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiMarkdownFormat textSize="s">
            {reason?.trim() ? reason : NO_REASON_LABEL}
          </EuiMarkdownFormat>
          {evidence.map((item, index) => (
            <React.Fragment key={index}>
              <EuiSpacer size="m" />
              <EvidenceView evidence={item} />
            </React.Fragment>
          ))}
        </>
      );
    }
    case 'conclusion':
      return <EuiMarkdownFormat textSize="s">{data.conclusion}</EuiMarkdownFormat>;
    case 'actions': {
      const total = data.proposals.length;
      const index = Math.min(selectedActionIndex ?? 0, total - 1);
      const { id, title, confidence, status, comment } = data.proposals[index];
      const summary = (
        <>
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{PROPOSAL_STATUS_LABELS[status]}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {PROPOSAL_CONFIDENCE_LABELS[confidence]}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiMarkdownFormat textSize="s">
            {comment.trim() ? comment : NO_COMMENT_LABEL}
          </EuiMarkdownFormat>
        </>
      );
      return (
        <>
          {total > 1 && (
            <>
              <ActionPager index={index} total={total} onChange={onChangeAction} />
              <EuiSpacer size="s" />
            </>
          )}
          <ProposalDecision
            key={id}
            investigationId={investigationId}
            proposalId={id}
            fallback={summary}
          />
        </>
      );
    }
    case 'hypotheses':
      return null;
    default: {
      const exhaustive: never = data;
      throw new Error(`Unhandled hypothesis tree node: ${JSON.stringify(exhaustive)}`);
    }
  }
};

const HypothesisTreeCanvas = ({
  input,
  isFullScreen,
  onToggleFullScreen,
}: {
  input: HypothesisTreeInput;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}): React.ReactElement => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { fitView, getZoom, setCenter } = useReactFlow();
  const canvasWidth = useStore(selectCanvasWidth);
  const canvasHeight = useStore(selectCanvasHeight);
  const [isHypothesesExpanded, setIsHypothesesExpanded] = useState(true);
  // Expanded by default; collapsing leaves a stack fronted by the highest-confidence action.
  const [isActionsExpanded, setIsActionsExpanded] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const [nodes, setNodes, onNodesChange] = useNodesState<HypothesisTreeFlowNode>([]);
  const { isRunning } = input;

  const graph = useMemo(
    () => buildHypothesisGraph({ input, isHypothesesExpanded, isActionsExpanded }),
    [input, isHypothesesExpanded, isActionsExpanded]
  );
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
    // canvas resizes (full screen, flyout resize) so no node is left out of view.
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

  const handleNodeClick: NodeMouseHandler<HypothesisTreeFlowNode> = useCallback(
    (_, { id, data }) => {
      if (data.kind === 'hypotheses') {
        setIsHypothesesExpanded((expanded) => !expanded);
        return;
      }
      if (selectedNodeId === id) {
        clearSelection();
        return;
      }
      setSelectedNodeId(id);
      setSelectedActionIndex(data.kind === 'actions' ? 0 : null);
      centreOnNode(id);
    },
    [centreOnNode, clearSelection, selectedNodeId]
  );

  const changeAction = useCallback((index: number) => {
    setSelectedActionIndex(index);
    // A collapsed stack only shows the first action, so reveal the one being viewed.
    if (index > 0) {
      setIsActionsExpanded(true);
    }
  }, []);

  const actionsContext = useMemo(
    () => ({
      onSelectAction: (index: number) => {
        if (selectedNodeId === HYPOTHESIS_TREE_NODE_IDS.actions && selectedActionIndex === index) {
          clearSelection();
          return;
        }
        if (selectedNodeId !== HYPOTHESIS_TREE_NODE_IDS.actions) {
          centreOnNode(HYPOTHESIS_TREE_NODE_IDS.actions);
        }
        setSelectedNodeId(HYPOTHESIS_TREE_NODE_IDS.actions);
        changeAction(index);
      },
      onToggleActionsExpanded: () => setIsActionsExpanded((expanded) => !expanded),
    }),
    [centreOnNode, changeAction, clearSelection, selectedActionIndex, selectedNodeId]
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
          <ControlButton
            onClick={onToggleFullScreen}
            title={isFullScreen ? EXIT_FULL_SCREEN_LABEL : ENTER_FULL_SCREEN_LABEL}
            aria-label={isFullScreen ? EXIT_FULL_SCREEN_LABEL : ENTER_FULL_SCREEN_LABEL}
            aria-pressed={isFullScreen}
            data-test-subj="investigationHypothesisTreeFullScreen"
          >
            <EuiIcon
              type={isFullScreen ? 'fullScreenExit' : 'fullScreen'}
              size="s"
              aria-hidden={true}
            />
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
                onChangeAction={changeAction}
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
  const fullScreenTitleId = useGeneratedHtmlId({
    prefix: 'investigationHypothesisTreeFullScreenTitle',
  });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const toggleFullScreen = useCallback(() => setIsFullScreen((fullScreen) => !fullScreen), []);
  const exitFullScreen = useCallback(() => setIsFullScreen(false), []);

  // EUI caps managed flyouts at 90% width and their `perspective` traps fixed-position children,
  // so full screen moves the canvas into a body-level layer. Rendering it through a portal into a
  // host element that is re-parented keeps the React tree, and so the canvas state, intact.
  const [canvasHost] = useState(() => {
    const host = document.createElement('div');
    host.style.width = '100%';
    host.style.height = '100%';
    return host;
  });
  const [flyoutSlot, setFlyoutSlot] = useState<HTMLDivElement | null>(null);
  const [fullScreenSlot, setFullScreenSlot] = useState<HTMLDivElement | null>(null);
  // EuiPortal mounts its children after this component's effects, so focus once the button exists.
  const focusOnMount = useCallback((button: HTMLButtonElement | null) => button?.focus(), []);

  useLayoutEffect(() => {
    const slot = isFullScreen ? fullScreenSlot : flyoutSlot;
    if (slot && canvasHost.parentElement !== slot) {
      slot.appendChild(canvasHost);
    }
  }, [canvasHost, flyoutSlot, fullScreenSlot, isFullScreen]);

  useEffect(() => {
    if (!isFullScreen) {
      return;
    }
    // Captured on window so Escape leaves full screen instead of reaching the flyout and closing it.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setIsFullScreen(false);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isFullScreen]);

  const description = hypothesesAnalyzedLabel(input.hypotheses.length);

  return (
    <>
      {/* Rendered from inside the conversation details flyout, whose transformed body would
          otherwise contain this fixed-position flyout. */}
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
              {description}
            </EuiText>
          </EuiFlyoutHeader>
          <div
            ref={setFlyoutSlot}
            css={css`
              flex: 1 1 auto;
              min-block-size: 0;
              position: relative;
              margin: ${euiTheme.size.base};
              border: ${euiTheme.border.thin};
              border-radius: ${euiTheme.border.radius.medium};
              overflow: hidden;
            `}
          />
        </EuiFlyout>
      </EuiPortal>
      {isFullScreen && (
        <EuiPortal>
          <div
            role="dialog"
            aria-modal={true}
            aria-labelledby={fullScreenTitleId}
            data-test-subj="investigationHypothesisTreeFullScreenLayer"
            css={css`
              position: fixed;
              inset: 0;
              z-index: ${euiTheme.levels.modal};
              display: flex;
              flex-direction: column;
              background: ${euiTheme.colors.backgroundBasePlain};
            `}
          >
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="m"
              responsive={false}
              css={css`
                flex: 0 0 auto;
                padding: ${euiTheme.size.m} ${euiTheme.size.l};
                border-bottom: ${euiTheme.border.thin};
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2 id={fullScreenTitleId}>{HYPOTHESIS_TREE_TITLE}</h2>
                </EuiTitle>
                <EuiText size="xs" color="subdued">
                  {description}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={EXIT_FULL_SCREEN_LABEL} disableScreenReaderOutput>
                  <EuiButtonIcon
                    buttonRef={focusOnMount}
                    iconType="fullScreenExit"
                    color="text"
                    aria-label={EXIT_FULL_SCREEN_LABEL}
                    onClick={exitFullScreen}
                    data-test-subj="investigationHypothesisTreeExitFullScreen"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div
              ref={setFullScreenSlot}
              css={css`
                flex: 1 1 auto;
                min-block-size: 0;
                position: relative;
              `}
            />
          </div>
        </EuiPortal>
      )}
      {createPortal(
        <ReactFlowProvider>
          <HypothesisTreeCanvas
            input={input}
            isFullScreen={isFullScreen}
            onToggleFullScreen={toggleFullScreen}
          />
        </ReactFlowProvider>,
        canvasHost
      )}
    </>
  );
};
