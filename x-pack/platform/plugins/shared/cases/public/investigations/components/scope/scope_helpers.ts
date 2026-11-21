/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { graphlib, layout } from '@dagrejs/dagre';
import type { EuiThemeComputed } from '@elastic/eui';
import type {
  EntityItem,
  EntityScope,
  EntityType,
  LinkItem,
  LinkKind,
  LinkStatus,
} from '../../../../common/investigations/types';
import * as i18n from './translations';

export const NODE_WIDTH = 224;
export const NODE_HEIGHT = 76;
/** Above this many visible nodes the graph only renders what is in view. */
export const LARGE_GRAPH_NODES = 80;
/** Most entities and links the graph loads. The list view pages through the same data. */
export const MAX_ENTITIES = 1000;
export const MAX_LINKS = 2000;
/** Above this many entities the tab opens on the list, with the graph grouped by type. */
export const LARGE_SCOPE_ENTITIES = 60;

export interface ScopeSelection {
  type: 'node' | 'edge';
  id: string;
}
export type ScopeView = 'graph' | 'list';
export type LayoutMode = 'saved' | 'type';

export interface ScopeFilters {
  showExternal: boolean;
  showSuspected: boolean;
  showDismissed: boolean;
}

export const DEFAULT_FILTERS: ScopeFilters = {
  showExternal: true,
  showSuspected: true,
  showDismissed: false,
};

export const ENTITY_TYPE_ORDER: readonly EntityType[] = ['host', 'user', 'nhi', 'external'];

export const ENTITY_KIND_LABELS: Record<EntityType, string> = {
  host: i18n.KIND_HOST,
  user: i18n.KIND_USER,
  nhi: i18n.KIND_NHI,
  external: i18n.KIND_EXTERNAL,
};

export const SCOPE_STATUS_LABELS: Record<EntityScope, string> = {
  primary: i18n.STATUS_PRIMARY,
  scoped: i18n.STATUS_SCOPED,
  suspected: i18n.STATUS_SUSPECTED,
  dismissed: i18n.STATUS_DISMISSED,
  external: i18n.STATUS_EXTERNAL,
};

export const SCOPE_STATUS_SHORT_LABELS: Record<EntityScope, string> = {
  primary: i18n.STATUS_PRIMARY_SHORT,
  scoped: i18n.STATUS_SCOPED,
  suspected: i18n.STATUS_SUSPECTED_SHORT,
  dismissed: i18n.STATUS_DISMISSED,
  external: i18n.STATUS_EXTERNAL_SHORT,
};

export const LINK_STATUS_LABELS: Record<LinkStatus, string> = {
  confirmed: i18n.LINK_CONFIRMED,
  suspected: i18n.LINK_SUSPECTED,
  dismissed: i18n.LINK_DISMISSED,
};

/** Entity statuses a person can pick. External destinations never change status. */
export const SELECTABLE_SCOPE_STATUSES: readonly EntityScope[] = [
  'primary',
  'scoped',
  'suspected',
  'dismissed',
];

export const isInScope = (entity: EntityItem): boolean =>
  entity.status !== 'dismissed' && entity.status !== 'suspected' && entity.status !== 'external';

export const isEntityVisible = (entity: EntityItem, filters: ScopeFilters): boolean => {
  switch (entity.status) {
    case 'dismissed':
      return filters.showDismissed;
    case 'external':
      return filters.showExternal;
    case 'suspected':
      return filters.showSuspected;
    default:
      return true;
  }
};

export const isLinkVisible = (
  link: LinkItem,
  visibleEntityIds: ReadonlySet<string>,
  filters: ScopeFilters
): boolean => {
  if (!visibleEntityIds.has(link.link.from_id) || !visibleEntityIds.has(link.link.to_id)) {
    return false;
  }
  if (link.status === 'dismissed') {
    return filters.showDismissed;
  }
  if (link.status === 'suspected') {
    return filters.showSuspected;
  }
  return true;
};

export type CriticalityTone = 'extreme' | 'high' | 'medium' | 'low' | 'none';

export const getCriticalityTone = (criticality?: string | null): CriticalityTone => {
  const value = (criticality ?? '').toLowerCase();
  if (value.startsWith('extreme')) return 'extreme';
  if (value.startsWith('high')) return 'high';
  if (value.startsWith('medium')) return 'medium';
  if (value.startsWith('low')) return 'low';
  return 'none';
};

export type BadgeColor = 'danger' | 'warning' | 'primary' | 'success' | 'default' | 'hollow';

export const CRITICALITY_BADGE_COLORS: Record<CriticalityTone, BadgeColor> = {
  extreme: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'default',
  none: 'hollow',
};

export const getCriticalitySwatchColor = (
  tone: CriticalityTone,
  euiTheme: EuiThemeComputed
): string => {
  switch (tone) {
    case 'extreme':
      return euiTheme.colors.danger;
    case 'high':
      return euiTheme.colors.warning;
    case 'medium':
      return euiTheme.colors.primary;
    case 'low':
      return euiTheme.colors.mediumShade;
    default:
      return euiTheme.colors.lightShade;
  }
};

export const getCriticalityLabel = (criticality?: string | null): string =>
  criticality && criticality.length > 0 ? criticality : i18n.CRITICALITY_NONE;

export const getLinkColor = (kind: LinkKind, euiTheme: EuiThemeComputed): string => {
  switch (kind) {
    case 'execution':
      return euiTheme.colors.textParagraph;
    case 'ownership':
      return euiTheme.colors.mediumShade;
    case 'authentication':
      return euiTheme.colors.primary;
    case 'network':
      return euiTheme.colors.warning;
    case 'lateral_movement':
      return euiTheme.colors.danger;
  }
};

export interface Point {
  x: number;
  y: number;
}

const ISOLATED_COLUMNS = 5;
const ISOLATED_GAP = 28;

/**
 * A left-to-right layered layout for entities that have links. Entities without a visible link
 * are laid out in a grid below, so they do not stack into one tall column.
 */
export const computeAutoLayout = (
  entities: readonly EntityItem[],
  links: readonly LinkItem[]
): Map<string, Point> => {
  const positions = new Map<string, Point>();
  if (entities.length === 0) {
    return positions;
  }
  const ids = new Set(entities.map((entity) => entity.id));
  const linked = new Set<string>();
  links.forEach(({ link }) => {
    if (link.from_id !== link.to_id && ids.has(link.from_id) && ids.has(link.to_id)) {
      linked.add(link.from_id);
      linked.add(link.to_id);
    }
  });
  const connected = entities.filter((entity) => linked.has(entity.id));
  const isolated = entities.filter((entity) => !linked.has(entity.id));

  let layoutHeight = 0;
  if (connected.length > 0) {
    const graph = new graphlib.Graph({ directed: true });
    graph.setGraph({ rankdir: 'LR', nodesep: 36, ranksep: 110, marginx: 20, marginy: 20 });
    graph.setDefaultEdgeLabel(() => ({}));
    connected.forEach((entity) =>
      graph.setNode(entity.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
    );
    links.forEach(({ link }) => {
      if (link.from_id !== link.to_id && graph.hasNode(link.from_id) && graph.hasNode(link.to_id)) {
        graph.setEdge(link.from_id, link.to_id);
      }
    });
    layout(graph);
    layoutHeight = graph.graph().height ?? 0;
    connected.forEach((entity) => {
      const node = graph.node(entity.id);
      if (node) {
        positions.set(entity.id, { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 });
      }
    });
  }

  const gridTop = connected.length > 0 ? layoutHeight + ISOLATED_GAP * 2 : 0;
  isolated.forEach((entity, index) => {
    positions.set(entity.id, {
      x: (index % ISOLATED_COLUMNS) * (NODE_WIDTH + ISOLATED_GAP),
      y: gridTop + Math.floor(index / ISOLATED_COLUMNS) * (NODE_HEIGHT + ISOLATED_GAP),
    });
  });
  return positions;
};

const ROWS_PER_COLUMN = 10;
const GRID_GAP = 28;

/** Columns per entity type, wrapping into sub-columns, for graphs too big to read as a web. */
export const computeTypeLayout = (entities: readonly EntityItem[]): Map<string, Point> => {
  const positions = new Map<string, Point>();
  let offsetX = 0;
  ENTITY_TYPE_ORDER.forEach((type) => {
    const group = entities.filter((entity) => entity.entity.type === type);
    if (group.length === 0) {
      return;
    }
    group.forEach((entity, index) => {
      const column = Math.floor(index / ROWS_PER_COLUMN);
      const row = index % ROWS_PER_COLUMN;
      positions.set(entity.id, {
        x: offsetX + column * (NODE_WIDTH + GRID_GAP),
        y: row * (NODE_HEIGHT + GRID_GAP),
      });
    });
    const columns = Math.ceil(group.length / ROWS_PER_COLUMN);
    offsetX += columns * (NODE_WIDTH + GRID_GAP) + GRID_GAP * 2;
  });
  return positions;
};

export const findSelectionFromItemId = (
  itemId: string | undefined,
  entities: readonly EntityItem[],
  links: readonly LinkItem[]
): ScopeSelection | null => {
  if (!itemId) {
    return null;
  }
  const entity = entities.find((candidate) => candidate.id === itemId || candidate.ref === itemId);
  if (entity) {
    return { type: 'node', id: entity.id };
  }
  const link = links.find((candidate) => candidate.id === itemId || candidate.ref === itemId);
  return link ? { type: 'edge', id: link.id } : null;
};
