/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { checkInputBudget } from '@kbn/isomer';
import type { GridNode } from '@kbn/isomer';
import { measureInput } from '../../instrumentation/measure';
import type {
  MaterializedLayoutNode,
  MaterializedNode,
  MaterializeLoss,
  UnsupportedNode,
} from '../../materialize/nodes';
import { isChartNode, isUnsupportedNode } from '../../materialize/nodes';
import { createUnsupportedNode } from '../../materialize/unsupported';
import type { MaterializeDescription } from '../../materialize/types';
import type { DashboardConfig, UnappliedControl } from './config';
import type { ListedDashboard, ListedPanel } from './list_panels';

/** Columns across a Kibana dashboard, and across the charts pack's `grid`. */
const GRID_COLUMNS = 48;

type GridPanel = GridNode<MaterializedNode>['panels'][number];

const untitledSection = () =>
  i18n.translate('xpack.isomer.materialize.dashboard.untitledSection', {
    defaultMessage: 'Untitled section',
  });

const tooLarge = () =>
  i18n.translate('xpack.isomer.materialize.dashboard.panelTooLarge', {
    defaultMessage: "This panel's data is too large to show with the rest of the dashboard.",
  });

const unappliedControlNote = (title: string) =>
  i18n.translate('xpack.isomer.materialize.dashboard.unappliedControl', {
    defaultMessage:
      'The selections of the "{title}" control are not applied: its options come from an ES|QL query.',
    values: { title },
  });

/** A dashboard grid position as whole grid units within the charts pack's 48 columns. */
const toPosition = ({ x, y, w, h }: ListedPanel['grid']) => {
  const left = Math.min(Math.max(Math.round(x), 0), GRID_COLUMNS - 1);
  return {
    x: left,
    y: Math.max(Math.round(y), 0),
    w: Math.min(Math.max(Math.round(w), 1), GRID_COLUMNS - left),
    h: Math.max(Math.round(h), 1),
  };
};

const withPanelId = <TNode extends MaterializedNode>(node: TNode, panelId?: string): TNode =>
  panelId && 'source' in node && node.source
    ? { ...node, source: { ...node.source, meta: { ...node.source.meta, panelId } } }
    : node;

/**
 * A panel's node as the grid holds it. Chart nodes leave their title and description to the
 * panel's header, as a dashboard panel's chart has none of its own, and carry the controls that
 * didn't apply to them as losses. Placeholders take the panel's name and link to the dashboard.
 */
const panelNode = (
  node: MaterializedNode,
  panel: ListedPanel,
  { link }: MaterializeDescription,
  unapplied: UnappliedControl[]
): MaterializedNode => {
  if (isUnsupportedNode(node)) {
    const linked = node.link ?? link;
    return withPanelId(
      {
        ...node,
        title: panel.label || node.title,
        ...(linked ? { link: linked } : {}),
      },
      panel.id
    );
  }
  if (isChartNode(node)) {
    const { title, description, ...chart } = node;
    const losses: MaterializeLoss[] = [
      ...(chart.losses ?? []),
      ...unapplied
        .filter(({ sectionId }) => !sectionId || sectionId === panel.sectionId)
        .map(
          ({ title: controlTitle }): MaterializeLoss => ({
            path: 'filters',
            kind: 'approximated',
            note: unappliedControlNote(controlTitle),
          })
        ),
    ];
    return withPanelId({ ...chart, ...(losses.length > 0 ? { losses } : {}) }, panel.id);
  }
  return node;
};

const gridPanel = (panel: ListedPanel, node: MaterializedNode): GridPanel => ({
  ...(panel.id ? { id: panel.id } : {}),
  ...(panel.title ? { title: panel.title } : {}),
  ...(panel.description ? { description: panel.description } : {}),
  ...toPosition(panel.grid),
  node,
});

const isOverBudget = (grid: MaterializedLayoutNode): boolean =>
  !checkInputBudget({ type: 'view', body: [grid] }).valid;

/**
 * Replaces the largest panels with placeholders until the grid fits Isomer's input budget, so a
 * dashboard too large to show whole still shows what fits.
 */
const fitInputBudget = (
  grid: GridNode<MaterializedNode>,
  description: MaterializeDescription
): GridNode<MaterializedNode> => {
  const panels = [...grid.panels, ...(grid.sections ?? []).flatMap((section) => section.panels)];
  const bySize = panels
    .filter(({ node }) => !isUnsupportedNode(node))
    .map((panel) => ({ panel, size: measureInput(panel.node).values }))
    .sort((a, b) => b.size - a.size);
  for (const { panel } of bySize) {
    if (!isOverBudget(grid)) {
      break;
    }
    panel.node = createUnsupportedNode(tooLarge(), {
      title: panel.title || ('title' in panel.node && panel.node.title) || undefined,
      link: description.link,
    });
  }
  return grid;
};

/**
 * The dashboard as a charts pack `grid`: each panel at its dashboard position with its node, and
 * each section with its panels. `nodes` are the panels' nodes in plan order.
 */
export const toGrid = (
  { state, resolved }: DashboardConfig,
  listed: ListedDashboard,
  nodes: MaterializedNode[],
  placeholder: (panel: ListedPanel, reason: string) => UnsupportedNode,
  description: MaterializeDescription
): MaterializedLayoutNode => {
  const unapplied = resolved?.unappliedControls ?? [];
  const planned = [...nodes];
  // Panels are listed in plan order, so each one with an input takes the next node.
  const panelsOf = (panels: ListedPanel[]) =>
    panels.map((panel) => {
      const node =
        'input' in panel.target ? planned.shift() : placeholder(panel, panel.target.reason);
      if (!node) {
        throw new Error(`No node was materialized for dashboard panel "${panel.id ?? ''}".`);
      }
      return gridPanel(panel, panelNode(node, panel, description, unapplied));
    });

  const grid: GridNode<MaterializedNode> = {
    type: 'grid',
    ...(state.title ? { title: state.title } : {}),
    ...(state.description ? { description: state.description } : {}),
    panels: panelsOf(listed.panels),
    ...(listed.sections.length > 0
      ? {
          sections: listed.sections.map((section) => ({
            ...(section.id ? { id: section.id } : {}),
            title: section.title.trim() || untitledSection(),
            ...(section.collapsed ? { collapsed: true } : {}),
            y: Math.max(Math.round(section.y), 0),
            panels: panelsOf(section.panels),
          })),
        }
      : {}),
  };
  return fitInputBudget(grid, description);
};
