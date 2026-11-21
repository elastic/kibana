/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
} from '@xyflow/react';
import type { NodeChange, NodeMouseHandler, OnNodeDrag } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { EntityItem, LinkItem } from '../../../../common/investigations/types';
import { EntityNode } from './entity_node';
import type { EntityFlowNode } from './entity_node';
import { LinkEdge } from './link_edge';
import type { LinkFlowEdge } from './link_edge';
import {
  LARGE_GRAPH_NODES,
  computeAutoLayout,
  computeTypeLayout,
  getCriticalityLabel,
  getLinkColor,
  isEntityVisible,
  isLinkVisible,
} from './scope_helpers';
import type { LayoutMode, Point, ScopeFilters, ScopeSelection } from './scope_helpers';
import * as i18n from './translations';

const nodeTypes = { entity: EntityNode };
const edgeTypes = { link: LinkEdge };
const GRAPH_HEIGHT = 540;

export interface ScopeGraphProps {
  entities: readonly EntityItem[];
  links: readonly LinkItem[];
  filters: ScopeFilters;
  layoutMode: LayoutMode;
  selection: ScopeSelection | null;
  onSelect: (selection: ScopeSelection | null) => void;
  onMove: (entity: EntityItem, position: Point) => void;
  /** Increase to fit the whole graph in view. */
  fitSignal: number;
}

const ScopeGraphCanvas: React.FC<ScopeGraphProps> = ({
  entities,
  links,
  filters,
  layoutMode,
  selection,
  onSelect,
  onMove,
  fitSignal,
}) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { fitView } = useReactFlow();
  const [localPositions, setLocalPositions] = useState<Record<string, Point>>({});

  const visibleEntities = useMemo(
    () => entities.filter((entity) => isEntityVisible(entity, filters)),
    [entities, filters]
  );
  const visibleLinks = useMemo(() => {
    const visibleIds = new Set(visibleEntities.map((entity) => entity.id));
    return links.filter((link) => isLinkVisible(link, visibleIds, filters));
  }, [links, visibleEntities, filters]);

  const entityNames = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity.entity.name])),
    [entities]
  );

  const autoPositions = useMemo(
    () =>
      layoutMode === 'type'
        ? computeTypeLayout(visibleEntities)
        : computeAutoLayout(visibleEntities, visibleLinks),
    [layoutMode, visibleEntities, visibleLinks]
  );

  // Forget local overrides once the saved position catches up with them.
  useEffect(() => {
    setLocalPositions((current) => {
      const keys = Object.keys(current);
      const stale = keys.filter((id) => {
        const saved = entities.find((entity) => entity.id === id)?.entity.position;
        return (
          saved && saved.x === Math.round(current[id].x) && saved.y === Math.round(current[id].y)
        );
      });
      if (stale.length === 0) {
        return current;
      }
      const next = { ...current };
      stale.forEach((id) => delete next[id]);
      return next;
    });
  }, [entities]);

  const baseNodes = useMemo<EntityFlowNode[]>(
    () =>
      visibleEntities.map((entity) => {
        const saved =
          layoutMode === 'saved' ? localPositions[entity.id] ?? entity.entity.position : null;
        const position = saved ?? autoPositions.get(entity.id) ?? { x: 0, y: 0 };
        return {
          id: entity.id,
          type: 'entity',
          position: { x: position.x, y: position.y },
          data: { entity },
          selected: selection?.type === 'node' && selection.id === entity.id,
          draggable: layoutMode === 'saved',
          ariaLabel: i18n.NODE_ARIA(
            entity.entity.name,
            getCriticalityLabel(entity.entity.criticality)
          ),
        };
      }),
    [visibleEntities, layoutMode, localPositions, autoPositions, selection]
  );

  const [nodes, setNodes] = useState<EntityFlowNode[]>(baseNodes);
  // Keep the node objects React Flow already measured. Replacing them drops their measured size
  // and handle bounds, and edges stop rendering until the nodes are measured again.
  useEffect(() => {
    setNodes((previous) => {
      const previousById = new Map(previous.map((node) => [node.id, node]));
      let changed = previous.length !== baseNodes.length;
      const next = baseNodes.map((node) => {
        const existing = previousById.get(node.id);
        if (!existing) {
          changed = true;
          return node;
        }
        const isDragging = Boolean(existing.dragging);
        const isSame =
          existing.data.entity === node.data.entity &&
          existing.selected === node.selected &&
          existing.draggable === node.draggable &&
          (isDragging ||
            (existing.position.x === node.position.x && existing.position.y === node.position.y));
        if (isSame) {
          return existing;
        }
        changed = true;
        return {
          ...existing,
          data: node.data,
          selected: node.selected,
          draggable: node.draggable,
          ariaLabel: node.ariaLabel,
          position: isDragging ? existing.position : node.position,
        };
      });
      return changed ? next : previous;
    });
  }, [baseNodes]);

  const handleNodesChange = useCallback((changes: Array<NodeChange<EntityFlowNode>>) => {
    const applicable = changes.filter(
      (change) => change.type === 'position' || change.type === 'dimensions'
    );
    if (applicable.length > 0) {
      setNodes((current) => applyNodeChanges(applicable, current));
    }
  }, []);

  const handleSelectEdge = useCallback(
    (linkId: string) => onSelect({ type: 'edge', id: linkId }),
    [onSelect]
  );

  const edges = useMemo<LinkFlowEdge[]>(() => {
    const groups = new Map<string, LinkItem[]>();
    visibleLinks.forEach((link) => {
      const key = [link.link.from_id, link.link.to_id].sort().join('|');
      groups.set(key, [...(groups.get(key) ?? []), link]);
    });
    return visibleLinks.map((link) => {
      const key = [link.link.from_id, link.link.to_id].sort().join('|');
      const group = groups.get(key) ?? [link];
      const index = group.findIndex((candidate) => candidate.id === link.id);
      const color = getLinkColor(link.link.kind, euiTheme);
      return {
        id: link.id,
        type: 'link',
        source: link.link.from_id,
        target: link.link.to_id,
        selected: selection?.type === 'edge' && selection.id === link.id,
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
        data: {
          link,
          color,
          offset: (index - (group.length - 1) / 2) * 26,
          fromName: entityNames.get(link.link.from_id) ?? link.link.from_id,
          toName: entityNames.get(link.link.to_id) ?? link.link.to_id,
          onSelect: handleSelectEdge,
        },
      };
    });
  }, [visibleLinks, selection, euiTheme, entityNames, handleSelectEdge]);

  const handleNodeClick = useCallback<NodeMouseHandler<EntityFlowNode>>(
    (_event, node) => onSelect({ type: 'node', id: node.id }),
    [onSelect]
  );

  const handleNodeDragStop = useCallback<OnNodeDrag<EntityFlowNode>>(
    (_event, node) => {
      setLocalPositions((current) => ({ ...current, [node.id]: node.position }));
      onMove(node.data.entity, node.position);
    },
    [onMove]
  );

  const fitKey = `${visibleEntities.length}:${layoutMode}:${fitSignal}`;
  useEffect(() => {
    const timer = setTimeout(() => {
      void fitView({ padding: 0.2, maxZoom: 1, duration: 200 });
    }, 120);
    return () => clearTimeout(timer);
  }, [fitKey, fitView]);

  return (
    <div
      css={css`
        height: ${GRAPH_HEIGHT}px;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        overflow: hidden;
      `}
      data-test-subj="investigationScopeGraph"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={() => onSelect(null)}
        nodesConnectable={false}
        nodeDragThreshold={3}
        minZoom={0.1}
        maxZoom={1.6}
        deleteKeyCode={null}
        onlyRenderVisibleElements={nodes.length > LARGE_GRAPH_NODES}
        colorMode={colorMode === 'DARK' ? 'dark' : 'light'}
      >
        <Background gap={20} color={euiTheme.colors.lightShade} />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
};
ScopeGraphCanvas.displayName = 'ScopeGraphCanvas';

export const ScopeGraph: React.FC<ScopeGraphProps> = (props) => (
  <ReactFlowProvider>
    <ScopeGraphCanvas {...props} />
  </ReactFlowProvider>
);
ScopeGraph.displayName = 'ScopeGraph';
