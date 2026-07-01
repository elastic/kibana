/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * StreamsCanvas — the React Flow canvas orchestrator.
 *
 * This file owns the canvas's React Flow state (nodes/edges) and the
 * interaction wiring that has to live next to it: drag (with live grid snap via
 * `onNodesChangeSnapped`), connect/reconnect, the routing-endpoint "puck"
 * drag-to-connect, placement of new nodes from the palette, click-to-edit
 * (`onNodeClick`), hover-to-spotlight-a-flow, search filtering, Cleanup
 * auto-layout, and the mode/keyboard wiring. Everything that can stand on its
 * own is a module under `./canvas/`:
 *
 *   constants / types / contexts ..... shared primitives
 *   nodes/* ........................... the node components + registry
 *   edges/* ........................... the connector edge, its path math,
 *                                       and bridge (line-hop) geometry
 *   (note: there is no "group" feature — selections stay flat)
 *   node-data / seed-graph ............ default data + the production seed
 *   auto-layout ....................... Cleanup layout + chain straightening
 *   connected-flow .................... directed reachability (hover + select)
 *   search ............................ KQL-like search → which streams show
 *   canvas-toolbar / canvas-minimap ... the bottom toolbar and the minimap
 *   canvas-context-menu ............... the right-click menu
 *   use-canvas-history ................ undo/redo
 *   use-canvas-shortcuts .............. ⌘A / ⌘Z / ⌘⇧Z
 *   use-canvas-selection .............. Select-stream / Cleanup-selection + menu
 *   use-edge-bridges .................. crossing-bridge computation
 *
 * Node/edge components reach back to the canvas via the contexts in
 * `./canvas/contexts.ts` (opening flyouts, publishing edge segments for
 * bridges) rather than threaded props.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  ConnectionLineType,
  Controls,
  getNodesBounds,
  MarkerType,
  reconnectEdge,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type IsValidConnection,
  type Node,
  type NodeChange,
  type OnConnectStart,
  type ReactFlowInstance,
  type XYPosition,
} from '@xyflow/react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import '@xyflow/react/dist/style.css';

import { DestinationFlyout } from './destination_flyout';
import { SourceFlyout } from './source_flyout';
import { PipelineFlyout } from './pipeline_flyout';
import { CreatePipelineFlyout } from './create_pipeline_flyout';
import { CreateRoutingFlyout } from './create_routing_flyout';
import { StreamsListTableTools } from './streams_list_table_tools';
import { STREAMS_TABLE_SEARCH_ARIA_LABEL } from './translations';

import {
  ALLOWED_CONNECTIONS,
  allowedSourceTypesFor,
  allowedTargetTypesFor,
  danglingEndpointIdOf,
  DRAG_DATA_TYPE,
  GRID_SIZE,
  noop,
  type CanvasNodeType,
} from './canvas/constants';
import type { DestinationNodeData, PipelineNodeData, SourceNodeData } from './canvas/types';
import {
  DestinationFlyoutContext,
  EdgeHopsContext,
  EdgeRoutingFlyoutContext,
  EdgeSegmentsContext,
  PipelineFlyoutContext,
  SourceFlyoutContext,
} from './canvas/contexts';
import { useEdgeBridges } from './canvas/use-edge-bridges';
import {
  createNode,
  pipelineData,
  routingData,
  sourceData,
  unconfiguredDestinationData,
} from './canvas/node-data';
import { initialEdges, initialNodes } from './canvas/seed-graph';
import { canvasSignature, INITIAL_CANVAS_SIGNATURE } from './canvas/canvas-signature';
import { computeCleanupLayout, straightenChains } from './canvas/auto-layout';
import { flowDirectionFor, reachableFlow } from './canvas/connected-flow';
import { evaluateSearch } from './canvas/search';
import { nodeTypes } from './canvas/nodes/node-types';
import { SourceNodeContents } from './canvas/nodes/source-node';
import { UnconfiguredDestinationContents } from './canvas/nodes/destination-node';
import { edgeTypes } from './canvas/edges/pipeline-routing-edge';
import { CanvasControls } from './canvas/canvas-toolbar';
import { useCanvasHistory } from './canvas/use-canvas-history';
import { useCanvasShortcuts } from './canvas/use-canvas-shortcuts';
import { useCanvasSelection } from './canvas/use-canvas-selection';
import { CanvasContextMenu } from './canvas/canvas-context-menu';

// Bound the pannable area so the user can't stray far from the streams. Derived
// from the seed graph's footprint plus generous padding (room to rearrange, but
// not to get lost in empty space). Used as React Flow's translateExtent.
const EXTENT_PADDING = 700;
const SEED_NODE_WIDTH = 300;
const SEED_NODE_HEIGHT = 140;
const CANVAS_TRANSLATE_EXTENT: [[number, number], [number, number]] = (() => {
  const xs = initialNodes.map((n) => n.position.x);
  const ys = initialNodes.map((n) => n.position.y);
  return [
    [Math.min(...xs) - EXTENT_PADDING, Math.min(...ys) - EXTENT_PADDING],
    [
      Math.max(...xs) + SEED_NODE_WIDTH + EXTENT_PADDING,
      Math.max(...ys) + SEED_NODE_HEIGHT + EXTENT_PADDING,
    ],
  ];
})();

function ShadowNode({ type, position }: { type: CanvasNodeType; position: XYPosition }) {
  // Mirror what createNode produces so the preview matches the placed node.
  const data = type === 'source' ? sourceData() : unconfiguredDestinationData();
  return (
    <div
      className={css`
        position: absolute;
        left: ${position.x}px;
        top: ${position.y}px;
        transform: translate(-50%, -50%);
        opacity: 0.6;
        pointer-events: none;
        z-index: 6;
      `}
    >
      {type === 'source' ? (
        <SourceNodeContents data={data as SourceNodeData} interactive={false} />
      ) : (
        <UnconfiguredDestinationContents
          data={data as DestinationNodeData}
          onClick={noop}
          interactive={false}
        />
      )}
    </div>
  );
}

function StreamsCanvasInner() {
  const { euiTheme } = useEuiTheme();
  const { screenToFlowPosition, getNodes, getEdges, getIntersectingNodes, fitView } =
    useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  // Snap nodes to the grid the connectors use, LIVE, by rewriting drag position
  // changes before they're applied (rather than fighting React Flow with a
  // separate setNodes). Each dragged card's vertical CENTER — where its handles
  // sit — lands on the grid, so it steps on exactly the same grid as the links
  // and there's no jump-into-place on release. Pucks and groups are left free.
  const onNodesChangeSnapped = useCallback(
    (changes: NodeChange<Node>[]) => {
      const snapped = changes.map((change) => {
        if (change.type !== 'position' || !change.position || !change.dragging) {
          return change;
        }
        const node = nodes.find((n) => n.id === change.id);
        if (!node || node.type === 'routingEndpoint') {
          return change;
        }
        const h = node.measured?.height ?? node.height ?? 0;
        const x = Math.round(change.position.x / GRID_SIZE) * GRID_SIZE;
        const centerY = Math.round((change.position.y + h / 2) / GRID_SIZE) * GRID_SIZE;
        return { ...change, position: { x, y: centerY - h / 2 } };
      });
      onNodesChange(snapped);
    },
    [nodes, onNodesChange]
  );

  // The "Save changes" button stays disabled until the user makes a meaningful
  // edit to the canvas. We derive "dirty" by comparing a structural signature of
  // the current nodes/edges (ids, types, and edge endpoints) against the initial
  // snapshot, so transient selection/move/measurement churn doesn't count.
  const hasChanges = useMemo(
    () => canvasSignature(nodes, edges) !== INITIAL_CANVAS_SIGNATURE,
    [nodes, edges]
  );

  // Bridge (line-hop) registry + computed hops for crossing connectors. See
  // useEdgeBridges — edges publish exact segments, hops come back here.
  const { edgeHops, segmentRegistry } = useEdgeBridges();

  const wrapperRef = useRef<HTMLDivElement>(null);
  // Tracks whether the in-progress edge reconnection landed on a valid handle.
  // If it didn't (dropped on empty canvas), onReconnectEnd disconnects the edge.
  const reconnectSucceededRef = useRef(false);
  // True while a connection is being drawn/reconnected. Hover-to-spotlight is
  // suppressed during this so dimming doesn't fade out (and visually fight) the
  // target anchors the user is aiming at.
  const connectingRef = useRef(false);
  const [placementType, setPlacementType] = useState<CanvasNodeType | null>(null);
  const [shadowPosition, setShadowPosition] = useState<XYPosition | null>(null);
  // Canvas interaction mode:
  //   - 'select' (mouse tool): left-drag on empty canvas draws a selection box;
  //     selected nodes move together; individual nodes are draggable. Panning is
  //     on middle/right mouse so left-drag stays free for selection.
  //   - 'pan' (hand tool): left-drag pans the canvas (grab/grabbing cursor) and
  //     nodes are locked in place.
  const [canvasMode, setCanvasMode] = useState<'select' | 'pan'>('select');
  // Presentational search box for the canvas toolbar (mirrors the list tables).
  const [searchQuery, setSearchQuery] = useState('');
  const [flyoutDestination, setFlyoutDestination] = useState<string | null>(null);
  const [flyoutSource, setFlyoutSource] = useState<string | null>(null);
  const [pipelineFlyoutEdgeId, setPipelineFlyoutEdgeId] = useState<string | null>(null);
  // The id of the connector whose "Add step" menu opened the routing flyout.
  // Applying a routing condition splices a routing node into that edge.
  const [routingFlyoutEdgeId, setRoutingFlyoutEdgeId] = useState<string | null>(null);
  // Editing an EXISTING pipeline / routing node: clicking the node opens the
  // same flyout used to create it (in a view/edit capacity). Kept separate from
  // the edge-triggered "Add step" flow above, which splices a new node in.
  // For a pipeline node we hold the clicked node's name so the editor opens
  // preloaded with that pipeline (rather than the pipeline picker); null = closed.
  const [pipelineNodeName, setPipelineNodeName] = useState<string | null>(null);
  const [routingNodeFlyoutOpen, setRoutingNodeFlyoutOpen] = useState(false);
  // While an end of a connector (or a brand-new connection) is being dragged:
  //   - connectingFromNodeId: the node the drag is anchored to (excluded from the
  //     highlight, since you can't connect a node to itself).
  //   - connectingTargetTypes: the node types the dragged end may legally land on.
  //   - connectingHandleSide: which handle anchor lights up on those nodes — the
  //     input ('target') anchor when dragging a head, the output ('source')
  //     anchor when re-anchoring a tail.
  // All reset when nothing is being dragged.
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);
  const [connectingTargetTypes, setConnectingTargetTypes] = useState<string[]>([]);
  const [connectingHandleSide, setConnectingHandleSide] = useState<'source' | 'target'>('target');
  // While dragging the routing-endpoint puck: the valid target node it is currently
  // hovering over (so we can fill in that node's anchor as the imminent drop point).
  const [hoveredTargetNodeId, setHoveredTargetNodeId] = useState<string | null>(null);
  // The flow (connected component) of the node currently under the cursor.
  // Everything outside it is dimmed to spotlight the hovered flow.
  const [hoveredFlow, setHoveredFlow] = useState<{
    nodeIds: Set<string>;
    edgeIds: Set<string>;
  } | null>(null);
  // Right-click context menu over a selection: screen position + the node ids
  // it acts on. Null when closed.
  const openDestinationFlyout = useCallback((destinationName: string) => {
    setFlyoutDestination(destinationName);
  }, []);

  const openSourceFlyout = useCallback((sourceName: string) => {
    setFlyoutSource(sourceName);
  }, []);

  // Undo / redo (see useCanvasHistory). recordHistory() is called at the start
  // of each mutating action so undo can restore the pre-change state.
  const { recordHistory, undo, redo, canUndo, canRedo } = useCanvasHistory({
    getNodes,
    getEdges,
    setNodes,
    setEdges,
  });

  // Selection actions + right-click context-menu state (see useCanvasSelection).
  const {
    contextMenu,
    setContextMenu,
    selectStream,
    cleanupSelected,
    onSelectionContextMenu,
    onNodeContextMenu,
  } = useCanvasSelection({ setNodes, recordHistory });

  const openPipelineFlyout = useCallback((edgeId: string) => {
    setPipelineFlyoutEdgeId(edgeId);
  }, []);

  const closePipelineFlyout = useCallback(() => {
    setPipelineFlyoutEdgeId(null);
  }, []);

  // Inserts a pipeline node in the middle of the connector that opened the flyout,
  // re-routing the original edge through the new node (source -> pipeline -> target),
  // then closes the flyout.
  const applyPipeline = useCallback(() => {
    const edgeId = pipelineFlyoutEdgeId;
    if (!edgeId) {
      return;
    }

    const targetEdge = getEdges().find((edge) => edge.id === edgeId);
    const sourceNode = targetEdge && getNodes().find((node) => node.id === targetEdge.source);
    const destinationNode = targetEdge && getNodes().find((node) => node.id === targetEdge.target);

    if (targetEdge && sourceNode && destinationNode) {
      recordHistory();
      const pipelineNodeId = `pipeline-${Date.now()}`;

      // Center the small pipeline node on the connector: horizontally between the
      // source's right edge and the destination's left edge, vertically on the line
      // joining the two nodes' centers. Fall back to sensible defaults if React Flow
      // has not measured the nodes yet.
      const sourceWidth = sourceNode.measured?.width ?? sourceNode.width ?? 204;
      const sourceHeight = sourceNode.measured?.height ?? sourceNode.height ?? 96;
      const destinationHeight =
        destinationNode.measured?.height ?? destinationNode.height ?? sourceHeight;
      // The "Big" pipeline card is a fixed-width horizontal card; offset by half
      // its footprint so its center lands on the connector midpoint.
      const PIPELINE_NODE_WIDTH = 120;
      const PIPELINE_NODE_HEIGHT = 40;

      const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
      const destinationCenterY = destinationNode.position.y + destinationHeight / 2;
      const sourceRightEdge = sourceNode.position.x + sourceWidth;

      const midpoint: XYPosition = {
        x: (sourceRightEdge + destinationNode.position.x) / 2 - PIPELINE_NODE_WIDTH / 2,
        y: (sourceCenterY + destinationCenterY) / 2 - PIPELINE_NODE_HEIGHT / 2,
      };

      setNodes((current) =>
        current.concat({
          id: pipelineNodeId,
          type: 'pipeline',
          position: midpoint,
          data: pipelineData(),
        })
      );

      setEdges((current) =>
        current
          .filter((edge) => edge.id !== edgeId)
          .concat(
            {
              id: `${targetEdge.source}-${pipelineNodeId}`,
              source: targetEdge.source,
              target: pipelineNodeId,
              type: 'pipelineRouting',
            },
            {
              id: `${pipelineNodeId}-${targetEdge.target}`,
              source: pipelineNodeId,
              target: targetEdge.target,
              type: 'pipelineRouting',
            }
          )
      );
    }

    setPipelineFlyoutEdgeId(null);
  }, [pipelineFlyoutEdgeId, getEdges, getNodes, setNodes, setEdges, recordHistory]);

  const openEdgeRoutingFlyout = useCallback((edgeId: string) => {
    setRoutingFlyoutEdgeId(edgeId);
  }, []);

  const closeEdgeRoutingFlyout = useCallback(() => {
    setRoutingFlyoutEdgeId(null);
  }, []);

  // Routing triggered from a connector's "Add step" menu: splice a routing node
  // into the middle of that connector, re-routing the original edge through the
  // new node (source -> routing -> target). Mirrors applyPipeline so an inline
  // routing node looks and connects just like an inline pipeline node.
  const applyEdgeRouting = useCallback(() => {
    const edgeId = routingFlyoutEdgeId;
    if (!edgeId) {
      return;
    }

    const targetEdge = getEdges().find((edge) => edge.id === edgeId);
    const sourceNode = targetEdge && getNodes().find((node) => node.id === targetEdge.source);
    const destinationNode = targetEdge && getNodes().find((node) => node.id === targetEdge.target);

    if (targetEdge && sourceNode && destinationNode) {
      recordHistory();
      const routingNodeId = `routing-${Date.now()}`;
      const endpointNodeId = `routing-endpoint-${Date.now()}`;

      // Center the small routing node on the connector: horizontally between the
      // source's right edge and the destination's left edge, vertically on the line
      // joining the two nodes' centers. Fall back to sensible defaults if React Flow
      // has not measured the nodes yet.
      const sourceWidth = sourceNode.measured?.width ?? sourceNode.width ?? 204;
      const sourceHeight = sourceNode.measured?.height ?? sourceNode.height ?? 96;
      const destinationHeight =
        destinationNode.measured?.height ?? destinationNode.height ?? sourceHeight;
      const ROUTING_NODE_SIZE = 32;

      const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
      const destinationCenterY = destinationNode.position.y + destinationHeight / 2;
      const sourceRightEdge = sourceNode.position.x + sourceWidth;

      const midpoint: XYPosition = {
        x: (sourceRightEdge + destinationNode.position.x) / 2 - ROUTING_NODE_SIZE / 2,
        y: (sourceCenterY + destinationCenterY) / 2 - ROUTING_NODE_SIZE / 2,
      };

      // Drop the dangling endpoint below the new routing node so its loose
      // connector reads as a second branch coming off the node, clear of the
      // horizontal source -> routing -> destination line.
      const ENDPOINT_GAP_Y = 96;
      const ENDPOINT_DOT_RADIUS = 6;
      const endpointPosition: XYPosition = {
        x: midpoint.x + ROUTING_NODE_SIZE / 2,
        y: midpoint.y + ROUTING_NODE_SIZE + ENDPOINT_GAP_Y - ENDPOINT_DOT_RADIUS,
      };

      setNodes((current) =>
        current.concat(
          {
            id: routingNodeId,
            type: 'routing',
            position: midpoint,
            data: routingData(),
          },
          {
            id: endpointNodeId,
            type: 'routingEndpoint',
            position: endpointPosition,
            data: {},
            draggable: true,
            selectable: false,
          }
        )
      );

      setEdges((current) =>
        current
          .filter((edge) => edge.id !== edgeId)
          .concat(
            {
              id: `${targetEdge.source}-${routingNodeId}`,
              source: targetEdge.source,
              target: routingNodeId,
              type: 'pipelineRouting',
            },
            {
              id: `${routingNodeId}-${targetEdge.target}`,
              source: routingNodeId,
              target: targetEdge.target,
              type: 'pipelineRouting',
            },
            // A second, dangling branch off the new routing node: it ends at a
            // free-floating endpoint puck the user can drag onto a destination to
            // wire up the route. Mirrors the badge-triggered routing connector.
            {
              id: `routing-${routingNodeId}-${endpointNodeId}`,
              source: routingNodeId,
              target: endpointNodeId,
              type: 'pipelineRouting',
              reconnectable: false,
              data: { routingEndpointNodeId: endpointNodeId },
            }
          )
      );
    }

    setRoutingFlyoutEdgeId(null);
  }, [routingFlyoutEdgeId, getEdges, getNodes, setNodes, setEdges, recordHistory]);

  // The loose end of a routing connector is a draggable "puck" node. Rather than
  // rely on connecting to a tiny handle, we let the user drag this node and detect
  // (by node intersection) which destination/pipeline it is dropped on. This makes
  // "drag to a destination" literal and reliable.

  // Returns the routing edge anchored to the given endpoint node, plus the type of
  // its real source node, or undefined if this isn't a dangling routing endpoint.
  const routingEdgeForEndpoint = useCallback(
    (endpointNodeId: string) => {
      const edge = getEdges().find((e) => danglingEndpointIdOf(e) === endpointNodeId);
      if (!edge) {
        return undefined;
      }
      const sourceType = getNodes().find((n) => n.id === edge.source)?.type;
      return { edge, sourceType };
    },
    [getEdges, getNodes]
  );

  // The valid target node a dragged routing endpoint is currently over (the
  // top-most intersecting node of an allowed type, excluding the connector's own
  // source). Used both to highlight while dragging and to wire up on drop.
  const intersectingTargetForEndpoint = useCallback(
    (endpointNode: Node, sourceType: string | undefined, originId: string) => {
      const allowed = allowedTargetTypesFor(sourceType);
      const intersecting = getIntersectingNodes(endpointNode, true);
      // Prefer the last (top-most) matching node.
      for (let i = intersecting.length - 1; i >= 0; i--) {
        const candidate = intersecting[i];
        if (candidate.id !== originId && candidate.type && allowed.includes(candidate.type)) {
          return candidate;
        }
      }
      return undefined;
    },
    [getIntersectingNodes]
  );

  // Snap dragged nodes so their connector anchors — the handles, which sit at
  // the node's vertical center — land on the grid. Applied LIVE during the drag
  // (not just on release) so a node steps on exactly the same grid the links
  // use; there's no jump-into-place when the drag ends. X snaps to the grid too.
  // Group containers and routing-endpoint pucks are left free.
  const centerSnapDragged = useCallback(
    (node: Node, draggedNodes?: Node[]) => {
      const moved = (draggedNodes?.length ? draggedNodes : [node]).filter(
        (n) => n.type !== 'routingEndpoint'
      );
      if (!moved.length) return;
      const snapped = new Map(
        moved.map((n) => {
          const h = n.measured?.height ?? n.height ?? 0;
          const x = Math.round(n.position.x / GRID_SIZE) * GRID_SIZE;
          const centerY = Math.round((n.position.y + h / 2) / GRID_SIZE) * GRID_SIZE;
          return [n.id, { x, y: centerY - h / 2 }];
        })
      );
      setNodes((current) =>
        current.map((n) => (snapped.has(n.id) ? { ...n, position: snapped.get(n.id)! } : n))
      );
    },
    [setNodes]
  );

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type !== 'routingEndpoint') {
        return;
      }
      const info = routingEdgeForEndpoint(node.id);
      if (!info) {
        return;
      }
      const target = intersectingTargetForEndpoint(node, info.sourceType, info.edge.source);
      // Highlight the valid drop targets (input anchors) while dragging the puck;
      // when hovering a specific valid target, mark it so its anchor fills in.
      setConnectingFromNodeId(info.edge.source);
      setConnectingTargetTypes(allowedTargetTypesFor(info.sourceType));
      setConnectingHandleSide('target');
      setHoveredTargetNodeId(target?.id ?? null);
    },
    [routingEdgeForEndpoint, intersectingTargetForEndpoint]
  );

  // Snapshot before a drag so undo restores the pre-drag positions.
  const onNodeDragStart = useCallback(() => {
    recordHistory();
  }, [recordHistory]);

  // Snapshot before any deletion (toolbar trash, Backspace/Delete key) so the
  // removed nodes/edges can be brought back with undo.
  const onBeforeDelete = useCallback(async () => {
    recordHistory();
    return true;
  }, [recordHistory]);

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node, draggedNodes?: Node[]) => {
      // Final center-snap (matches the live snap, so nothing jumps on release).
      centerSnapDragged(node, draggedNodes);

      if (node.type !== 'routingEndpoint') {
        return;
      }
      const info = routingEdgeForEndpoint(node.id);
      setConnectingFromNodeId(null);
      setConnectingTargetTypes([]);
      setHoveredTargetNodeId(null);
      if (!info) {
        return;
      }
      const target = intersectingTargetForEndpoint(node, info.sourceType, info.edge.source);
      if (!target) {
        // No valid target under the puck. If it was dropped back onto its own
        // source node, cancel the connector entirely (collapse-to-delete);
        // otherwise leave it where it is so the connector stays available to retry.
        const overOrigin = getIntersectingNodes(node, true).some((n) => n.id === info.edge.source);
        if (overOrigin) {
          setEdges((current) => current.filter((edge) => edge.id !== info.edge.id));
          setNodes((current) => current.filter((n) => n.id !== node.id));
        }
        return;
      }
      // Wire the routing connector to the real target and remove the puck.
      setEdges((current) =>
        current.map((edge) =>
          edge.id === info.edge.id
            ? {
                ...edge,
                target: target.id,
                targetHandle: null,
                // Now wired to a real node: re-enable reconnect and drop the
                // dangling marker so it behaves like any other edge.
                reconnectable: true,
                data: { ...edge.data, routingEndpointNodeId: undefined },
              }
            : edge
        )
      );
      setNodes((current) => current.filter((n) => n.id !== node.id));
    },
    [
      centerSnapDragged,
      routingEdgeForEndpoint,
      intersectingTargetForEndpoint,
      getIntersectingNodes,
      setEdges,
      setNodes,
    ]
  );

  // Click-to-edit for every block. React Flow only fires onNodeClick for a
  // genuine click (one that did not turn into a drag), so this coexists cleanly
  // with dragging the same card. Destinations keep their own in-card click
  // handling (the unconfigured → configuring → configured state machine), so we
  // deliberately don't intercept them here.
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Ignore context-menu gestures: a macOS ctrl+click (and right-click) is a
      // button-0 click with ctrlKey set, which would otherwise open a flyout and
      // hide the right-click menu. Let those fall through to onNodeContextMenu.
      if (event.ctrlKey || event.metaKey || event.button === 2) {
        return;
      }
      if (node.type === 'source') {
        openSourceFlyout((node.data as SourceNodeData).title);
      } else if (node.type === 'pipeline') {
        // Clicking a pipeline already on the canvas opens the pipeline editor
        // preloaded with that pipeline, not the "Apply pipeline" picker.
        setPipelineNodeName((node.data as PipelineNodeData).title);
      } else if (node.type === 'routing') {
        // Clicking a routing node already on the canvas opens its configured
        // condition in an editable state, not the empty "create routing" prompt.
        setRoutingNodeFlyoutOpen(true);
      } else if (node.type === 'destination') {
        const data = node.data as DestinationNodeData;
        if (data.mode === 'configuring') {
          return; // the inline form handles its own clicks
        }
        const connected = getEdges().some((edge) => edge.target === node.id);
        if (data.mode === 'configured' && connected) {
          openDestinationFlyout(data.title);
        } else {
          // Unconfigured, or configured-but-not-connected: open the config form.
          setNodes((current) =>
            current.map((n) =>
              n.id === node.id ? { ...n, data: { ...n.data, mode: 'configuring' } } : n
            )
          );
        }
      }
    },
    [openSourceFlyout, openDestinationFlyout, getEdges, setNodes]
  );

  // Hovering a node spotlights everywhere an event could travel relative to it
  // (downstream from a source, upstream from a destination, both for a
  // pipeline/routing node) and dims everything else.
  const onNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // While building a link, don't spotlight/dim — it would fade the very
      // anchors the user is dragging toward.
      if (connectingRef.current) return;
      setHoveredFlow(reachableFlow(node.id, getEdges(), flowDirectionFor(node.type)));
    },
    [getEdges]
  );
  const onNodeMouseLeave = useCallback(() => setHoveredFlow(null), []);

  // Starting to drag a brand-new connection out of an output anchor: highlight
  // the input anchors of every node it could legally land on (same affordance as
  // reconnecting an existing connector's head).
  const onConnectStart = useCallback<OnConnectStart>(
    (_event, params) => {
      if (!params.nodeId || params.handleType !== 'source') {
        return;
      }
      const sourceType = getNodes().find((node) => node.id === params.nodeId)?.type;
      connectingRef.current = true;
      setHoveredFlow(null);
      setConnectingFromNodeId(params.nodeId);
      setConnectingTargetTypes(allowedTargetTypesFor(sourceType));
      setConnectingHandleSide('target');
    },
    [getNodes]
  );

  // Persist a brand-new connection drawn between two anchors. `isValidConnection`
  // has already gated this to an allowed node-type pair.
  const onConnect = useCallback(
    (connection: Connection) => {
      recordHistory();
      setEdges((current) =>
        current.concat({
          ...connection,
          id: `${connection.source}${
            connection.sourceHandle ? `:${connection.sourceHandle}` : ''
          }-${connection.target}`,
          type: 'pipelineRouting',
        })
      );
    },
    [setEdges, recordHistory]
  );

  // Always clear the target highlight when a new-connection drag ends, whether or
  // not it landed on a valid anchor.
  const onConnectEnd = useCallback(() => {
    connectingRef.current = false;
    setConnectingFromNodeId(null);
    setConnectingTargetTypes([]);
  }, []);

  // When a connector is reconnected onto a valid handle, update the edge and (for
  // a routing connector that was still dangling) clean up the now-orphaned
  // free-floating endpoint node and clear the dangling marker so the connector
  // behaves like a normal, fully-wired edge from now on.
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      reconnectSucceededRef.current = true;

      const endpointNodeId = oldEdge.data?.routingEndpointNodeId as string | undefined;
      const landedOnRealTarget = Boolean(endpointNodeId) && newConnection.target !== endpointNodeId;

      setEdges((current) => {
        const updated = reconnectEdge(oldEdge, newConnection, current);
        if (!landedOnRealTarget) {
          return updated;
        }
        // Drop the dangling marker from the reconnected edge.
        return updated.map((edge) =>
          edge.source === newConnection.source &&
          edge.target === newConnection.target &&
          edge.data?.routingEndpointNodeId === endpointNodeId
            ? { ...edge, data: { ...edge.data, routingEndpointNodeId: undefined } }
            : edge
        );
      });

      if (landedOnRealTarget) {
        setNodes((current) => current.filter((node) => node.id !== endpointNodeId));
      }
    },
    [setEdges, setNodes]
  );

  // When an end of a connector starts being dragged, highlight the anchors it can
  // legally be dropped on. NOTE: React Flow reports `handleType` as the *fixed*
  // end (the one that stays put), so:
  //   - handleType 'source' → the head (target end) is moving while the source
  //     stays. It can land on the input anchors of nodes the source may connect
  //     to (e.g. a routing connector's loose end onto another destination).
  //   - handleType 'target' → the tail (source end) is moving while the target
  //     stays. It re-anchors onto the output anchors of nodes that may feed the
  //     target.
  const onReconnectStart = useCallback(
    (_event: React.MouseEvent | React.TouchEvent, edge: Edge, handleType: 'source' | 'target') => {
      reconnectSucceededRef.current = false;
      connectingRef.current = true;
      setHoveredFlow(null);
      const currentNodes = getNodes();
      if (handleType === 'source') {
        const sourceType = currentNodes.find((node) => node.id === edge.source)?.type;
        setConnectingFromNodeId(edge.source);
        setConnectingTargetTypes(allowedTargetTypesFor(sourceType));
        setConnectingHandleSide('target');
      } else {
        const targetType = currentNodes.find((node) => node.id === edge.target)?.type;
        setConnectingFromNodeId(edge.target);
        setConnectingTargetTypes(allowedSourceTypesFor(targetType));
        setConnectingHandleSide('source');
      }
    },
    [getNodes]
  );

  // When a reconnect drag ends without a successful onReconnect, decide whether to
  // delete the edge:
  //   - Collapse-to-delete: if the moving end was dropped on the node at the OTHER
  //     end of the edge (dragging one extreme onto the other), remove the edge.
  //   - Drop-on-empty: an already-connected edge dropped on empty canvas is removed
  //     (disconnect), while a still-dangling routing connector is left as-is so it
  //     simply snaps back and can be retried rather than vanishing.
  const onReconnectEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      edge: Edge,
      handleType: 'source' | 'target',
      connectionState: FinalConnectionState
    ) => {
      connectingRef.current = false;
      setConnectingFromNodeId(null);
      setConnectingTargetTypes([]);

      if (reconnectSucceededRef.current) {
        return;
      }

      const otherEndNodeId = handleType === 'source' ? edge.source : edge.target;
      const droppedOnNodeId = connectionState.toNode?.id ?? null;
      const collapsedOntoOtherEnd = droppedOnNodeId !== null && droppedOnNodeId === otherEndNodeId;
      const isDangling = Boolean(edge.data?.routingEndpointNodeId);

      if (collapsedOntoOtherEnd || !isDangling) {
        setEdges((current) => current.filter((existing) => existing.id !== edge.id));
      }
    },
    [setEdges]
  );

  // Connections are only valid between the node-type pairs in ALLOWED_CONNECTIONS;
  // anything else (and self-connections) is rejected. This also drives the
  // `valid` styling React Flow applies to the anchor the cursor magnetizes to.
  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) {
        return false;
      }
      const currentNodes = getNodes();
      const sourceType = currentNodes.find((node) => node.id === connection.source)?.type;
      const targetType = currentNodes.find((node) => node.id === connection.target)?.type;
      return ALLOWED_CONNECTIONS.some(([from, to]) => from === sourceType && to === targetType);
    },
    [getNodes]
  );

  const defaultEdgeOptions = {
    type: 'pipelineRouting',
    // Every connection can be grabbed and re-routed from either end.
    reconnectable: true,
    style: { stroke: euiTheme.colors.mediumShade, strokeWidth: 1.5 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: euiTheme.colors.mediumShade,
    },
  };

  const addNodeAtScreenPosition = useCallback(
    (type: CanvasNodeType, screenPosition: { x: number; y: number }) => {
      const position = screenToFlowPosition(screenPosition);
      setNodes((current) => current.concat(createNode(type, position)));
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes(DRAG_DATA_TYPE)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const type = event.dataTransfer.getData(DRAG_DATA_TYPE) as CanvasNodeType;
      if (type !== 'source' && type !== 'destination') {
        return;
      }
      event.preventDefault();
      addNodeAtScreenPosition(type, { x: event.clientX, y: event.clientY });
    },
    [addNodeAtScreenPosition]
  );

  const activatePlacement = useCallback((type: CanvasNodeType) => {
    setPlacementType((current) => (current === type ? null : type));
    setShadowPosition(null);
  }, []);

  // "Cleanup": auto-layout the graph into tidy columns by flow depth, then fit
  // the result into view. Excludes transient routing-endpoint pucks (they track
  // their routing node) so a half-drawn routing branch isn't yanked into a row.
  // Straighten connectors by aligning the centers of 1:1-linked nodes (see
  // straightenChains). Cosmetic, so it doesn't record history.
  const straighten = useCallback(() => {
    const pos = straightenChains(getNodes(), getEdges());
    if (!pos.size) return;
    setNodes((current) =>
      current.map((node) => {
        const next = pos.get(node.id);
        return next ? { ...node, position: next } : node;
      })
    );
  }, [getNodes, getEdges, setNodes]);

  const cleanup = useCallback(() => {
    recordHistory();
    const current = getNodes();
    const currentEdges = getEdges();
    // 1) lay out into flow-depth columns, then 2) straighten 1:1 chains on those
    // laid-out positions — in ONE synchronous pass, so there's no timing race
    // (a separate post-setNodes straighten could run before React committed the
    // new positions, leaving chains jogged).
    const layout = computeCleanupLayout(
      current.filter((node) => node.type !== 'routingEndpoint'),
      currentEdges
    );
    const laidOut = current.map((node) => {
      const next = layout.get(node.id);
      return next ? { ...node, position: next } : node;
    });
    const straight = straightenChains(laidOut, currentEdges);
    setNodes(
      laidOut.map((node) => {
        const next = straight.get(node.id);
        return next ? { ...node, position: next } : node;
      })
    );
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 60);
  }, [getNodes, getEdges, setNodes, fitView, recordHistory]);

  // Straighten the seed graph once on mount (after nodes are measured).
  useEffect(() => {
    const timer = setTimeout(straighten, 150);
    return () => clearTimeout(timer);
  }, [straighten]);

  const onPaneClick = useCallback(() => {
    if (placementType && shadowPosition) {
      addNodeAtScreenPosition(placementType, shadowPosition);
    }
    setPlacementType(null);
    setShadowPosition(null);
    setContextMenu(null);
  }, [placementType, shadowPosition, addNodeAtScreenPosition, setContextMenu]);

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!placementType) {
        return;
      }
      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }
      setShadowPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    },
    [placementType]
  );

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setPlacementType(null);
      setShadowPosition(null);
    }
  }, []);

  // Keyboard shortcuts: ⌘/Ctrl+A select all, ⌘/Ctrl+Z undo,
  // ⌘/Ctrl+Shift+Z (or Ctrl+Y) redo (see useCanvasShortcuts).
  useCanvasShortcuts({ setNodes, undo, redo });

  // Center the canvas content (at 100% zoom) once React Flow has mounted and
  // measured the nodes, so the elements appear in the middle on load.
  const handleInit = useCallback((instance: ReactFlowInstance<Node, Edge>) => {
    const currentNodes = instance.getNodes();
    if (currentNodes.length === 0) {
      return;
    }
    const bounds = getNodesBounds(currentNodes);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    instance.setCenter(centerX, centerY, { zoom: 1 });
  }, []);

  // While dragging a connection (new or reconnect), light up the anchors of every
  // node the connection could legally land on — nodes of a valid target type,
  // excluding the one the connection starts from. Two things happen to those
  // anchors for the duration of the drag:
  //   1. the anchor's dot becomes a hollow primary ring (the "drop here" cue), and
  //   2. the handle element is stretched to cover its whole node, so dropping
  //      anywhere on the node connects to that anchor (a forgiving target, since
  //      the dot itself is small and the cards are wide). The dot is pinned to the
  //      node edge via the ::after pseudo-element so it stays visually in place.
  // The specific anchor the cursor snaps to additionally fills in via its own
  // `connectingto.valid` state.
  const connectingTargetSelector = connectingTargetTypes
    .map(
      (type) =>
        `.react-flow__node-${type}:not([data-id='${
          connectingFromNodeId ?? ''
        }']) .react-flow__handle.${connectingHandleSide}`
    )
    .join(', ');
  // Where the dot sits once the handle is stretched over the node: the input
  // anchor hugs the left edge, the output anchor the right edge.
  const connectingDotLeft = connectingHandleSide === 'target' ? '0' : '100%';
  const connectingHighlightClassName = css`
    ${connectingTargetSelector} {
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      top: 0;
      left: 0;
      transform: none;
      border-radius: ${euiTheme.border.radius.medium};
      background: transparent;
    }
    ${connectingTargetSelector}::after {
      left: ${connectingDotLeft};
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border-color: ${euiTheme.colors.primary};
      box-shadow: 0 0 0 3px ${euiTheme.colors.backgroundBasePrimary},
        0 0 0 5px ${euiTheme.colors.primary};
    }
    ${hoveredTargetNodeId
      ? `.react-flow__node[data-id='${hoveredTargetNodeId}'] .react-flow__handle.${connectingHandleSide}::after`
      : '.__never__'} {
      background-color: ${euiTheme.colors.primary};
      border-color: ${euiTheme.colors.primary};
    }
  `;

  // Dim every node/edge that is NOT part of the hovered flow.
  const dimClassName = useMemo(() => {
    if (!hoveredFlow) return '';
    const nodeKeep = [...hoveredFlow.nodeIds]
      .map((id) => `.react-flow__node[data-id="${id}"]`)
      .join(', ');
    const edgeKeep = [...hoveredFlow.edgeIds]
      .map((id) => `.react-flow__edge[data-id="${id}"]`)
      .join(', ');
    return css`
      .react-flow__node {
        opacity: 0.18;
        transition: opacity 120ms ease;
      }
      .react-flow__edge {
        opacity: 0.12;
        transition: opacity 120ms ease;
      }
      ${nodeKeep ? `${nodeKeep} { opacity: 1; }` : ''}
      ${edgeKeep ? `${edgeKeep} { opacity: 1; }` : ''}
    `;
  }, [hoveredFlow]);

  // Search: hide streams with no match, outline the matching nodes in blue.
  // Debounced — the input stays responsive, but the filter only runs ~300ms
  // after the user stops typing (avoids re-filtering on every keystroke).
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const search = useMemo(
    () => evaluateSearch(nodes, edges, debouncedSearch),
    [nodes, edges, debouncedSearch]
  );
  // Hiding is done via React Flow's `hidden` flag (below) so hidden nodes are
  // truly non-interactive; this class only draws the blue ring on matches.
  const searchClassName = useMemo(() => {
    if (!search.active || search.matchedIds.size === 0) return '';
    const matched = [...search.matchedIds]
      .map((id) => `.react-flow__node[data-id="${id}"] .euiPanel`)
      .join(', ');
    return css`
      ${matched} {
        box-shadow: 0 0 0 2px ${euiTheme.colors.primary}, 0 2px 8px ${euiTheme.colors.primary}40 !important;
      }
    `;
  }, [search, euiTheme]);

  // Apply the search filter by toggling React Flow's `hidden` flag on nodes/edges
  // (rather than CSS display:none), so filtered-out items can't be marquee-
  // selected or clicked. No-ops when nothing actually changes, to avoid loops.
  useEffect(() => {
    setNodes((current) => {
      let changed = false;
      const next = current.map((n) => {
        const hide = search.active && search.hiddenNodeIds.has(n.id);
        if (!!n.hidden !== hide) {
          changed = true;
          return { ...n, hidden: hide };
        }
        return n;
      });
      return changed ? next : current;
    });
    setEdges((current) => {
      let changed = false;
      const next = current.map((e) => {
        const hide = search.active && search.hiddenEdgeIds.has(e.id);
        if (!!e.hidden !== hide) {
          changed = true;
          return { ...e, hidden: hide };
        }
        return e;
      });
      return changed ? next : current;
    });
  }, [search, setNodes, setEdges]);

  return (
    <DestinationFlyoutContext.Provider value={openDestinationFlyout}>
      <SourceFlyoutContext.Provider value={openSourceFlyout}>
        <PipelineFlyoutContext.Provider value={openPipelineFlyout}>
          <EdgeRoutingFlyoutContext.Provider value={openEdgeRoutingFlyout}>
            <EdgeSegmentsContext.Provider value={segmentRegistry}>
              <EdgeHopsContext.Provider value={edgeHops}>
                <div
                  className={css`
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    width: 100%;
                    gap: ${euiTheme.size.m};
                  `}
                >
                  {/* Toolbar mirrors the search + filters row on the list table tabs, but the
          primary action saves the canvas instead of creating a new entity. */}
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    className={css`
                      flex-grow: 0;
                      max-height: 32px;
                    `}
                  >
                    <EuiFlexItem>
                      <EuiFieldSearch
                        compressed
                        incremental
                        fullWidth
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search streams — e.g. kafka, source:nginx, destination:archive"
                        aria-label={STREAMS_TABLE_SEARCH_ARIA_LABEL}
                        data-test-subj="streamsCanvasSearch"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <StreamsListTableTools
                        newButtonIconType="save"
                        newButtonDisabled={!hasChanges}
                        newButtonLabel={i18n.translate(
                          'xpack.streams.streamsCanvas.saveChangesButtonLabel',
                          {
                            defaultMessage: 'Save changes',
                          }
                        )}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <div
                    ref={wrapperRef}
                    role="presentation"
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onMouseMove={onMouseMove}
                    onKeyDown={onKeyDown}
                    className={`${css`
                      position: relative;
                      flex: 1;
                      min-height: 0;
                      width: 100%;
                      background-color: ${euiTheme.colors.backgroundBaseSubdued};
                      border: ${euiTheme.border.width.thin} solid
                        ${euiTheme.colors.borderBaseSubdued};
                      border-radius: ${euiTheme.border.radius.small};
                      overflow: hidden;
                      ${placementType ? 'cursor: copy;' : ''}

                      /* Hand (pan) mode: the empty canvas reads as draggable — a hand at
             rest, a closed fist while panning. */
          ${canvasMode === 'pan'
                        ? `
          .react-flow__pane {
            cursor: grab;
          }
          .react-flow__pane.dragging {
            cursor: grabbing;
          }
          `
                        : ''}

          /* React Flow's native edge reconnect anchors sit on top of the handle
             dots at each connector end; show a grab cursor over their hit area so
             the connection ends feel draggable. */
          .react-flow__edgeupdater {
                        cursor: grab;
                      }

                      /* Selected state. Our nodes are custom EUI cards (every node type
             renders an EuiPanel), so React Flow's default selection outline
             lands on the transparent, zero-border node wrapper and is
             invisible — selecting a stream looked like nothing happened. Draw an
             on-brand primary ring on the card itself, which covers both the
             "Select stream" action and drag-marquee selections. Group
             containers (no EuiPanel) keep React Flow's own selected styling. */
                      .react-flow__node.selected .euiPanel {
                        box-shadow: 0 0 0 2px ${euiTheme.colors.primary},
                          0 2px 8px ${euiTheme.colors.primary}40;
                        border-radius: ${euiTheme.border.radius.medium};
                        transition: box-shadow 120ms ease;
                      }
                    `} ${
                      connectingTargetTypes.length > 0 ? connectingHighlightClassName : dimClassName
                    } ${searchClassName}`}
                  >
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      nodeTypes={nodeTypes}
                      edgeTypes={edgeTypes}
                      defaultEdgeOptions={defaultEdgeOptions}
                      onNodesChange={onNodesChangeSnapped}
                      onEdgesChange={onEdgesChange}
                      onNodeClick={onNodeClick}
                      onNodeMouseEnter={onNodeMouseEnter}
                      onNodeMouseLeave={onNodeMouseLeave}
                      onNodeContextMenu={onNodeContextMenu}
                      onSelectionContextMenu={onSelectionContextMenu}
                      onPaneContextMenu={() => setContextMenu(null)}
                      nodeDragThreshold={4}
                      onNodeDragStart={onNodeDragStart}
                      onNodeDrag={onNodeDrag}
                      onNodeDragStop={onNodeDragStop}
                      onBeforeDelete={onBeforeDelete}
                      onConnect={onConnect}
                      onConnectStart={onConnectStart}
                      onConnectEnd={onConnectEnd}
                      onReconnect={onReconnect}
                      onReconnectStart={onReconnectStart}
                      onReconnectEnd={onReconnectEnd}
                      isValidConnection={isValidConnection}
                      connectionLineType={ConnectionLineType.SmoothStep}
                      connectionRadius={60}
                      reconnectRadius={14}
                      onPaneClick={onPaneClick}
                      onInit={handleInit}
                      defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                      // Keep the viewport near the streams: bound panning to the seed
                      // footprint + padding, and don't allow zooming out into the void.
                      translateExtent={CANVAS_TRANSLATE_EXTENT}
                      minZoom={0.4}
                      maxZoom={2}
                      // Node snapping is done in onNodeDrag (center-snap), not snapToGrid,
                      // so dragged cards step on the same grid the connectors align to.
                      // Figma-style trackpad navigation: two-finger scroll (any direction)
                      // pans the canvas; pinch still zooms. Disabling zoomOnScroll keeps the
                      // wheel/trackpad mapped to panning rather than zooming.
                      panOnScroll
                      zoomOnScroll={false}
                      nodesConnectable
                      edgesReconnectable
                      // Mode-driven interaction. In 'select' mode left-drag is reserved for
                      // the selection box and pan moves to the MIDDLE mouse button only —
                      // the right button is left free so right-click opens the context menu
                      // (incl. on a single node). In 'pan' mode left-drag pans and nodes are
                      // locked.
                      nodesDraggable={canvasMode === 'select'}
                      selectionOnDrag={canvasMode === 'select'}
                      selectNodesOnDrag={canvasMode === 'select'}
                      selectionMode={SelectionMode.Partial}
                      panOnDrag={canvasMode === 'pan' ? true : [1]}
                      proOptions={{ hideAttribution: true }}
                    >
                      <Background gap={GRID_SIZE} />
                      <Controls showInteractive={false} showFitView={false} />
                      {/* Minimap hidden for now — re-enable by uncommenting:
          <CanvasMinimap hoveredFlow={hoveredFlow} /> */}
                    </ReactFlow>
                    {placementType && shadowPosition ? (
                      <ShadowNode type={placementType} position={shadowPosition} />
                    ) : null}
                    {search.noResult ? (
                      <div
                        className={css`
                          position: absolute;
                          inset: 0;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          pointer-events: none;
                          z-index: 6;
                        `}
                      >
                        <EuiPanel
                          hasShadow
                          paddingSize="l"
                          className={css`
                            text-align: center;
                            border-radius: ${euiTheme.border.radius.medium};
                          `}
                        >
                          <EuiText>
                            <strong>No results</strong>
                          </EuiText>
                          <EuiText size="xs" color="subdued">
                            {i18n.translate('xpack.streams.streamsCanvas.noResultsHint', {
                              defaultMessage: 'No streams match your search.',
                            })}
                          </EuiText>
                        </EuiPanel>
                      </div>
                    ) : null}
                    <CanvasControls
                      placementType={placementType}
                      onActivatePlacement={activatePlacement}
                      onCleanup={cleanup}
                      canvasMode={canvasMode}
                      onChangeMode={setCanvasMode}
                      onUndo={undo}
                      onRedo={redo}
                      canUndo={canUndo}
                      canRedo={canRedo}
                    />
                    <CanvasContextMenu
                      menu={contextMenu}
                      onClose={() => setContextMenu(null)}
                      onSelectStream={selectStream}
                      onCleanup={cleanupSelected}
                    />
                  </div>
                </div>
                {flyoutDestination !== null ? (
                  <DestinationFlyout
                    destinationName={flyoutDestination}
                    onClose={() => setFlyoutDestination(null)}
                  />
                ) : null}
                {flyoutSource !== null ? (
                  <SourceFlyout sourceName={flyoutSource} onClose={() => setFlyoutSource(null)} />
                ) : null}
                {pipelineFlyoutEdgeId !== null ? (
                  <PipelineFlyout onClose={closePipelineFlyout} onApply={applyPipeline} />
                ) : null}
                {pipelineNodeName !== null ? (
                  <CreatePipelineFlyout
                    pipelineName={pipelineNodeName}
                    initialPopulated
                    onClose={() => setPipelineNodeName(null)}
                    onApply={() => setPipelineNodeName(null)}
                  />
                ) : null}
                {routingFlyoutEdgeId !== null ? (
                  <CreateRoutingFlyout
                    onClose={closeEdgeRoutingFlyout}
                    onApply={applyEdgeRouting}
                  />
                ) : null}
                {routingNodeFlyoutOpen ? (
                  <CreateRoutingFlyout
                    initialStep="applied"
                    onClose={() => setRoutingNodeFlyoutOpen(false)}
                    onApply={() => setRoutingNodeFlyoutOpen(false)}
                  />
                ) : null}
              </EdgeHopsContext.Provider>
            </EdgeSegmentsContext.Provider>
          </EdgeRoutingFlyoutContext.Provider>
        </PipelineFlyoutContext.Provider>
      </SourceFlyoutContext.Provider>
    </DestinationFlyoutContext.Provider>
  );
}

export function StreamsCanvas() {
  return (
    <ReactFlowProvider>
      <StreamsCanvasInner />
    </ReactFlowProvider>
  );
}
