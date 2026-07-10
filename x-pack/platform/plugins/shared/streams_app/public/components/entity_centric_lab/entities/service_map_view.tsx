/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type ColorMode,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import Dagre from '@dagrejs/dagre';
import {
  EuiEmptyPrompt,
  EuiPanel,
  EuiText,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  getEffectiveEntityHealth,
  useChaosModeEnabled,
  useEntityDisplayName,
} from '@kbn/entity-centric-lab-flyout';
import '@xyflow/react/dist/style.css';
import type { Entity, EntityHealth } from './fake_entities';
import { buildFakeEntities } from './fake_entities';

interface Props {
  readonly entities: readonly Entity[];
  readonly onSelectEntity: (entityName: string) => void;
}

// ---------------------------------------------------------------------------
// Health helpers
// ---------------------------------------------------------------------------

const HEALTH_LABEL: Record<EntityHealth, string> = {
  healthy: i18n.translate('xpack.streams.entityCentricLab.entities.serviceMap.health.healthy', {
    defaultMessage: 'Healthy',
  }),
  atRisk: i18n.translate('xpack.streams.entityCentricLab.entities.serviceMap.health.atRisk', {
    defaultMessage: 'At risk',
  }),
  unhealthy: i18n.translate('xpack.streams.entityCentricLab.entities.serviceMap.health.unhealthy', {
    defaultMessage: 'Unhealthy',
  }),
};

const HEALTH_RANK: Record<EntityHealth, number> = { unhealthy: 0, atRisk: 1, healthy: 2 };

const healthColor = (health: EntityHealth, euiTheme: EuiThemeComputed): string => {
  switch (health) {
    case 'healthy':
      return euiTheme.colors.severity.success;
    case 'atRisk':
      return euiTheme.colors.severity.warning;
    case 'unhealthy':
      return euiTheme.colors.severity.danger;
  }
};

// ---------------------------------------------------------------------------
// Synthetic relationship model
//
// The lab dataset is a flat list of entities with no persisted edges, so the
// service map fabricates a deterministic set of relationships from each
// entity's category / sub-type. Services are the hubs (they call each other
// and depend on databases, queues, models, cloud resources and hosts), while
// infrastructure follows an ownership chain (container → pod → node → cluster,
// deployment → namespace → cluster, cloud resource → region). The result is a
// recognisable "service map" without needing a real topology API.
// ---------------------------------------------------------------------------

// Deterministic hash → index so the fabricated edges are stable across
// reloads (the map never re-shuffles between renders).
const hashIndex = (input: string, mod: number): number => {
  if (mod <= 0) return 0;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33 + input.charCodeAt(i)) % 2147483647;
  }
  return hash % mod;
};

interface EntityPools {
  readonly services: readonly Entity[];
  readonly databases: readonly Entity[];
  readonly middlewares: readonly Entity[];
  readonly llms: readonly Entity[];
  readonly hosts: readonly Entity[];
  readonly cloudRegions: readonly Entity[];
  readonly cloudResources: readonly Entity[];
  readonly k8sClusters: readonly Entity[];
  readonly k8sNamespaces: readonly Entity[];
  readonly k8sNodes: readonly Entity[];
  readonly k8sPods: readonly Entity[];
}

const buildPools = (entities: readonly Entity[]): EntityPools => {
  const k8s = entities.filter((entity) => entity.category === 'kubernetes');
  return {
    services: entities.filter((entity) => entity.category === 'services'),
    databases: entities.filter((entity) => entity.category === 'databases'),
    middlewares: entities.filter((entity) => entity.category === 'middlewares'),
    llms: entities.filter((entity) => entity.category === 'llms'),
    hosts: entities.filter((entity) => entity.category === 'hosts'),
    cloudRegions: entities.filter((entity) => entity.type === 'AWS region'),
    cloudResources: entities.filter(
      (entity) => entity.category === 'cloud' && entity.type !== 'AWS region'
    ),
    k8sClusters: k8s.filter((entity) => entity.subType === 'Clusters'),
    k8sNamespaces: k8s.filter((entity) => entity.subType === 'Namespaces'),
    k8sNodes: k8s.filter((entity) => entity.subType === 'Nodes'),
    k8sPods: k8s.filter((entity) => entity.subType === 'Pods'),
  };
};

const pick = (pool: readonly Entity[], seed: string): string | undefined =>
  pool.length > 0 ? pool[hashIndex(seed, pool.length)].name : undefined;

/**
 * Directed dependency targets for a single entity (source depends on / calls
 * target). Names reference other entities in the same dataset; unresolved
 * names are dropped when the global edge list is assembled.
 */
const outgoingTargets = (entity: Entity, pools: EntityPools): string[] => {
  const targets: string[] = [];
  switch (entity.category) {
    case 'services': {
      // Service-to-service call ring so the services form a connected mesh.
      if (pools.services.length > 1) {
        const idx = pools.services.findIndex((service) => service.name === entity.name);
        const next = pools.services[(idx + 1) % pools.services.length];
        if (next && next.name !== entity.name) targets.push(next.name);
      }
      const db = pick(pools.databases, `${entity.name}:db`);
      if (db) targets.push(db);
      if (hashIndex(`${entity.name}:mw`, 2) === 0) {
        const mw = pick(pools.middlewares, `${entity.name}:mw`);
        if (mw) targets.push(mw);
      }
      if (hashIndex(`${entity.name}:llm`, 3) === 0) {
        const llm = pick(pools.llms, `${entity.name}:llm`);
        if (llm) targets.push(llm);
      }
      const runtime =
        pick(pools.hosts, `${entity.name}:host`) ?? pick(pools.k8sPods, `${entity.name}:pod`);
      if (runtime) targets.push(runtime);
      if (hashIndex(`${entity.name}:cloud`, 2) === 0) {
        const cloud = pick(pools.cloudResources, `${entity.name}:cloud`);
        if (cloud) targets.push(cloud);
      }
      return targets;
    }
    case 'cloud': {
      if (entity.type === 'AWS region') return targets;
      const region = pick(pools.cloudRegions, `${entity.name}:region`);
      if (region) targets.push(region);
      return targets;
    }
    case 'kubernetes': {
      switch (entity.subType) {
        case 'Containers': {
          const pod = pick(pools.k8sPods, `${entity.name}:pod`);
          if (pod) targets.push(pod);
          return targets;
        }
        case 'Pods': {
          const node = pick(pools.k8sNodes, `${entity.name}:node`);
          if (node) targets.push(node);
          return targets;
        }
        case 'Deployments': {
          const namespace = pick(pools.k8sNamespaces, `${entity.name}:ns`);
          if (namespace) targets.push(namespace);
          return targets;
        }
        case 'Namespaces':
        case 'Nodes': {
          const cluster = pick(pools.k8sClusters, `${entity.name}:cluster`);
          if (cluster) targets.push(cluster);
          return targets;
        }
        default:
          return targets;
      }
    }
    default:
      // hosts / databases / middlewares / llms are leaf dependencies.
      return targets;
  }
};

interface RawEdge {
  readonly source: string;
  readonly target: string;
}

// Focus nodes are capped so the map stays legible; services are always kept
// (they're the hubs) and the remaining budget is filled worst-health-first.
const MAX_FOCUS_NODES = 40;
const MAX_TOTAL_NODES = 90;

const NODE_WIDTH = 200;
const NODE_HEIGHT = 48;

interface EntityNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly typeLabel: string;
  readonly health: EntityHealth;
  readonly isFocus: boolean;
  readonly onSelect: (entityName: string) => void;
}

type EntityFlowNode = Node<EntityNodeData, 'entity'>;

interface GraphData {
  readonly nodes: EntityFlowNode[];
  readonly edges: Edge[];
}

const buildGraphData = (
  focusEntities: readonly Entity[],
  allEntities: readonly Entity[],
  onSelect: (entityName: string) => void,
  euiTheme: EuiThemeComputed
): GraphData => {
  const byName = new Map<string, Entity>();
  for (const entity of allEntities) byName.set(entity.name, entity);

  const pools = buildPools(allEntities);

  // Global directed edges across the whole dataset. Building them once lets
  // us pull in a focus entity's neighbours regardless of the active category
  // scope — e.g. the services calling a database on the Databases page.
  const globalEdges: RawEdge[] = [];
  const adjacency = new Map<string, Set<string>>();
  const addAdjacency = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };
  for (const entity of allEntities) {
    for (const target of outgoingTargets(entity, pools)) {
      if (!byName.has(target) || target === entity.name) continue;
      globalEdges.push({ source: entity.name, target });
      addAdjacency(entity.name, target);
      addAdjacency(target, entity.name);
    }
  }

  // Focus selection: services first (hubs), then worst-health others.
  const services = focusEntities.filter((entity) => entity.category === 'services');
  const others = focusEntities
    .filter((entity) => entity.category !== 'services')
    .sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || a.name.localeCompare(b.name));
  const focusList = [...services, ...others].slice(0, MAX_FOCUS_NODES);

  const included = new Map<string, Entity>();
  for (const entity of focusList) included.set(entity.name, entity);
  // Pull in one hop of neighbours so relationships are visible even when the
  // neighbour sits outside the current filter/category.
  for (const entity of focusList) {
    const neighbours = adjacency.get(entity.name);
    if (!neighbours) continue;
    for (const neighbour of neighbours) {
      if (included.size >= MAX_TOTAL_NODES) break;
      if (included.has(neighbour)) continue;
      const resolved = byName.get(neighbour);
      if (resolved) included.set(neighbour, resolved);
    }
  }

  const nodes: EntityFlowNode[] = Array.from(included.values()).map((entity) => ({
    id: entity.name,
    type: 'entity',
    position: { x: 0, y: 0 },
    data: {
      label: entity.name,
      typeLabel: entity.subType ?? entity.type,
      health: entity.health,
      isFocus: included.has(entity.name) && focusList.some((f) => f.name === entity.name),
      onSelect,
    },
  }));

  const seenEdges = new Set<string>();
  const edges: Edge[] = [];
  for (const edge of globalEdges) {
    if (!included.has(edge.source) || !included.has(edge.target)) continue;
    const id = `${edge.source}~>${edge.target}`;
    if (seenEdges.has(id)) continue;
    seenEdges.add(id);
    const targetHealth = included.get(edge.target)!.health;
    const emphasized = targetHealth === 'unhealthy';
    edges.push({
      id,
      source: edge.source,
      target: edge.target,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      style: {
        strokeWidth: emphasized ? 1.75 : 1,
        stroke: emphasized ? euiTheme.colors.danger : euiTheme.colors.borderBasePlain,
      },
    });
  }

  return { nodes: applyDagreLayout(nodes, edges), edges };
};

// ---------------------------------------------------------------------------
// Layout (dagre, left-to-right) — mirrors the helper APM's service map uses.
// ---------------------------------------------------------------------------

const applyDagreLayout = (nodes: EntityFlowNode[], edges: Edge[]): EntityFlowNode[] => {
  if (nodes.length === 0) return nodes;
  const graph = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({ rankdir: 'LR', ranksep: 90, nodesep: 24, marginx: 24, marginy: 24 })
    .setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }
  try {
    Dagre.layout(graph);
  } catch {
    // Extremely rare internal dagre failure — fall back to the un-positioned
    // nodes; React Flow's fitView still renders them in a usable grid.
    return nodes.map((node) => ({
      ...node,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));
  }
  return nodes.map((node) => {
    const laidOut = graph.node(node.id);
    return {
      ...node,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      position: laidOut
        ? { x: Math.round(laidOut.x - NODE_WIDTH / 2), y: Math.round(laidOut.y - NODE_HEIGHT / 2) }
        : node.position,
    };
  });
};

// ---------------------------------------------------------------------------
// Node rendering
// ---------------------------------------------------------------------------

const EntityNode = memo(({ data, sourcePosition, targetPosition }: NodeProps<EntityFlowNode>) => {
  const { euiTheme } = useEuiTheme();
  const displayName = useEntityDisplayName(data.label, data.typeLabel);
  const color = healthColor(data.health, euiTheme);
  // Mouse clicks are handled by React Flow's `onNodeClick` (a DOM click inside
  // a node doesn't reliably bubble out of the canvas). This handler only
  // covers keyboard activation for accessibility.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      data.onSelect(data.label);
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${displayName} — ${data.typeLabel} — ${HEALTH_LABEL[data.health]}`}
      data-test-subj={`entityCentricLabServiceMapNode-${data.label}`}
      css={css`
        width: ${NODE_WIDTH}px;
        height: ${NODE_HEIGHT}px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 10px;
        text-align: left;
        background-color: ${euiTheme.colors.emptyShade};
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
        border-left: 4px solid ${color};
        border-radius: ${euiTheme.border.radius.medium};
        box-shadow: ${data.isFocus ? euiTheme.colors.borderBasePlain : 'transparent'} 0 0 0
          ${data.isFocus ? '1px' : '0'};
        cursor: pointer;
        &:hover,
        &:focus {
          border-color: ${color};
          outline: none;
        }
      `}
    >
      <Handle type="target" position={targetPosition ?? Position.Left} style={{ opacity: 0 }} />
      <span
        aria-hidden
        css={css`
          flex: 0 0 auto;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: ${color};
        `}
      />
      <span
        css={css`
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        `}
      >
        <span
          css={css`
            font-size: ${euiTheme.size.m};
            font-weight: ${euiTheme.font.weight.medium};
            color: ${euiTheme.colors.textParagraph};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {displayName}
        </span>
        <span
          css={css`
            font-size: ${euiTheme.size.s};
            color: ${euiTheme.colors.textSubdued};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {data.typeLabel}
        </span>
      </span>
      <Handle type="source" position={sourcePosition ?? Position.Right} style={{ opacity: 0 }} />
    </div>
  );
});

const nodeTypes = { entity: EntityNode };

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export const ServiceMapView = ({ entities, onSelectEntity }: Props) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const chaosOn = useChaosModeEnabled();

  // The full dataset backs the neighbour lookup so relationships to entities
  // outside the active category scope still resolve; chaos mode re-rolls
  // health the same way the other views do.
  const allEntities = useMemo<Entity[]>(() => {
    const dataset = buildFakeEntities();
    return dataset.entities.map((entity) => {
      const effective = getEffectiveEntityHealth(entity.name, entity.health, chaosOn);
      return effective === entity.health ? entity : { ...entity, health: effective };
    });
  }, [chaosOn]);

  const focusEntities = useMemo<Entity[]>(
    () =>
      entities.map((entity) => {
        const effective = getEffectiveEntityHealth(entity.name, entity.health, chaosOn);
        return effective === entity.health ? entity : { ...entity, health: effective };
      }),
    [entities, chaosOn]
  );

  const { nodes, edges } = useMemo(
    () => buildGraphData(focusEntities, allEntities, onSelectEntity, euiTheme),
    [focusEntities, allEntities, onSelectEntity, euiTheme]
  );

  if (nodes.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="graphApp"
        title={
          <h2>
            {i18n.translate('xpack.streams.entityCentricLab.entities.serviceMap.empty.title', {
              defaultMessage: 'No entities match your filters',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.streams.entityCentricLab.entities.serviceMap.empty.body', {
                defaultMessage: 'Try removing one or more filters to see the relationships.',
              })}
            </p>
          </EuiText>
        }
      />
    );
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
      <ReactFlowProvider>
        <div
          css={css`
            width: 100%;
            height: 640px;
            .react-flow__node,
            .react-flow__node * {
              cursor: pointer;
            }
            .react-flow__attribution {
              display: none;
            }
          `}
          data-test-subj="entityCentricLabServiceMap"
        >
          <ReactFlow<EntityFlowNode>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_event, node) => onSelectEntity(node.id)}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
            colorMode={colorMode.toLowerCase() as ColorMode}
          >
            <Background gap={24} size={1} color={euiTheme.colors.borderBaseSubdued} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              ariaLabel={i18n.translate(
                'xpack.streams.entityCentricLab.entities.serviceMap.minimapAriaLabel',
                { defaultMessage: 'Service map minimap' }
              )}
            />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </EuiPanel>
  );
};
