/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import { byReadingOrder, formatGrid, getPanelContainers, getPanelKind } from '../dashboard_panels';
import { getLastWrittenDashboardId } from '../extract_dashboard';
import { noDashboardResult, scoreChecks, skippedResult, type Check } from '../evaluator_utils';
import {
  TOP_LEVEL,
  type DashboardAgentEvaluator,
  type LayoutEditGold,
  type LayoutItem,
  type LayoutPlacementGold,
} from '../types';

export const DASHBOARD_LAYOUT_EDIT_EVALUATOR_NAME = 'Dashboard Layout Edit';

interface LocatedPanel {
  panel: AttachmentPanel;
  container: string;
}

/** Panels by id and container, sections by id, and the outer order of top-level ids. */
interface LayoutIndex {
  containers: Map<string, AttachmentPanel[]>;
  panels: Map<string, LocatedPanel>;
  sections: Map<string, DashboardSection>;
  outerOrder: string[];
}

const indexLayout = (dashboard: DashboardAttachmentData): LayoutIndex => {
  const containers = new Map(
    getPanelContainers(dashboard).map(({ sectionId, panels }) => [sectionId ?? TOP_LEVEL, panels])
  );
  const panels = new Map(
    [...containers].flatMap(([container, containerPanels]) =>
      containerPanels.map((panel): [string, LocatedPanel] => [panel.id, { panel, container }])
    )
  );
  const sections = new Map(dashboard.panels.filter(isSection).map((item) => [item.id, item]));
  const outerOrder = dashboard.panels
    .map((item) => ({ id: item.id, y: item.grid.y, x: isSection(item) ? 0 : item.grid.x }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map(({ id }) => id);
  return { containers, panels, sections, outerOrder };
};

const describeItem = (item: LayoutItem): string =>
  typeof item === 'string' ? item : `added ${item.added}`;

const resolveItem = (item: LayoutItem, seed: LayoutIndex, result: LayoutIndex) => {
  if (typeof item === 'string') {
    return item;
  }
  if (item.added === 'section') {
    return [...result.sections.keys()].find((id) => !seed.sections.has(id));
  }
  return [...result.containers.values()]
    .flatMap((panels) => [...panels].sort(byReadingOrder))
    .find((panel) => !seed.panels.has(panel.id) && getPanelKind(panel) === item.added)?.id;
};

const checkPanelsKept = (gold: LayoutEditGold, seed: LayoutIndex, result: LayoutIndex): Check => {
  const removed = new Set(gold.removed ?? []);
  const seedIds = [...seed.panels.keys(), ...seed.sections.keys()];
  const exists = (id: string) => result.panels.has(id) || result.sections.has(id);
  const missing = seedIds.filter((id) => !removed.has(id) && !exists(id));
  const notRemoved = [...removed].filter(exists);
  return {
    assertion: 'panels',
    passed: missing.length === 0 && notRemoved.length === 0,
    detail:
      compact([
        missing.length > 0 && `missing [${missing.join(', ')}]`,
        notRemoved.length > 0 && `not removed [${notRemoved.join(', ')}]`,
      ]).join('; ') || 'kept and removed as asked',
  };
};

// Adding or removing a section shifts the outer `y` of every top-level panel
// below it, so top-level panels compare only their columns and size.
const sameGrid = (container: string, a: AttachmentPanel['grid'], b: AttachmentPanel['grid']) =>
  a.x === b.x && a.w === b.w && a.h === b.h && (container === TOP_LEVEL || a.y === b.y);

const checkStableContainers = (
  gold: LayoutEditGold,
  seed: LayoutIndex,
  result: LayoutIndex
): Check[] => {
  const removed = new Set(gold.removed ?? []);
  const changes = new Set(gold.changes);
  return [...seed.containers]
    .filter(([container]) => !changes.has(container) && !removed.has(container))
    .map(([container, panels]) => {
      const moved = panels
        .filter(({ id }) => !removed.has(id))
        .flatMap(({ id, grid }) => {
          const now = result.panels.get(id);
          if (now?.container !== container) {
            return [`${id} left the container`];
          }
          return sameGrid(container, grid, now.panel.grid)
            ? []
            : [`${id} ${formatGrid(grid)} -> ${formatGrid(now.panel.grid)}`];
        });
      const joined = (result.containers.get(container) ?? [])
        .filter(({ id }) => seed.panels.get(id)?.container !== container)
        .map(({ id }) => `${id} joined the container`);
      const changed = [...moved, ...joined];
      return {
        assertion: `stable.${container}`,
        passed: changed.length === 0,
        detail: changed.length === 0 ? 'unchanged' : changed.join('; '),
      };
    });
};

const checkOuterOrder = (seed: LayoutIndex, result: LayoutIndex): Check => {
  const resultOuter = new Set(result.outerOrder);
  const seedOuter = new Set(seed.outerOrder);
  const before = seed.outerOrder.filter((id) => resultOuter.has(id));
  const after = result.outerOrder.filter((id) => seedOuter.has(id));
  return {
    assertion: 'outerOrder',
    passed: before.join() === after.join(),
    detail: `seed ${before.join(' | ')}; result ${after.join(' | ')}`,
  };
};

const checkCollapsed = (seed: LayoutIndex, result: LayoutIndex): Check[] => {
  const collapsed = [...seed.sections.values()].filter((item) => item.collapsed);
  if (collapsed.length === 0) {
    return [];
  }
  const expanded = collapsed
    .filter(({ id }) => result.sections.get(id)?.collapsed === false)
    .map(({ id }) => id);
  return [
    {
      assertion: 'collapsed',
      passed: expanded.length === 0,
      detail:
        expanded.length === 0
          ? 'collapsed sections stay collapsed'
          : `expanded [${expanded.join(', ')}]`,
    },
  ];
};

/** Reading order of the item's container; the outer order for a section. */
const getSiblingOrder = (id: string, result: LayoutIndex): string[] => {
  if (result.sections.has(id)) {
    return result.outerOrder;
  }
  const container = result.panels.get(id)?.container;
  const panels = container === undefined ? [] : result.containers.get(container) ?? [];
  return [...panels].sort(byReadingOrder).map((panel) => panel.id);
};

const checkPlacement = (
  { item, in: container, first, beside, below, w, after, before }: LayoutPlacementGold,
  index: number,
  seed: LayoutIndex,
  result: LayoutIndex
): Check => {
  const assertion = `placements[${index}]`;
  const id = resolveItem(item, seed, result);
  const located = id === undefined ? undefined : result.panels.get(id);
  if (id === undefined || (!located && !result.sections.has(id))) {
    return { assertion, passed: false, detail: `${describeItem(item)} not found` };
  }

  const order = getSiblingOrder(id, result);
  const position = (other: string) => order.indexOf(other);
  const neighbour = (other: string) => {
    const found = result.panels.get(other);
    return found?.container === located?.container ? found?.panel.grid : undefined;
  };
  const grid = located?.panel.grid;
  const besideGrid = beside === undefined ? undefined : neighbour(beside);
  const belowGrid = below === undefined ? undefined : neighbour(below);

  const problems = compact([
    container !== undefined && (located?.container ?? TOP_LEVEL) !== container
      ? `in ${located?.container ?? TOP_LEVEL}, not ${container}`
      : undefined,
    first && order[0] !== id ? `first is ${order[0]}` : undefined,
    beside !== undefined && (!grid || besideGrid?.y !== grid.y || besideGrid.h !== grid.h)
      ? `not beside ${beside}`
      : undefined,
    below !== undefined && (!grid || !belowGrid || grid.y !== belowGrid.y + belowGrid.h)
      ? `not below ${below}`
      : undefined,
    w !== undefined && grid?.w !== w ? `w ${grid?.w}, not ${w}` : undefined,
    after !== undefined && !(position(after) !== -1 && position(after) < position(id))
      ? `not after ${after}`
      : undefined,
    before !== undefined && !(position(before) !== -1 && position(id) < position(before))
      ? `not before ${before}`
      : undefined,
  ]);

  return {
    assertion,
    passed: problems.length === 0,
    detail: `${describeItem(item)} (${id}${grid ? ` ${formatGrid(grid)}` : ''}): ${
      problems.length === 0 ? 'placed as asked' : problems.join('; ')
    }`,
  };
};

/**
 * Checks that a layout edit changed only what the prompt asked: kept and
 * removed panels, unchanged grids in the containers the edit should not
 * touch, the outer order of surviving top-level panels and sections, collapsed
 * sections, and where the prompt puts each panel. Gaps and overlaps are
 * scored by Dashboard Layout Rules.
 */
export const dashboardLayoutEditEvaluator: DashboardAgentEvaluator = {
  name: DASHBOARD_LAYOUT_EDIT_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    const gold = expected?.layoutEdit;
    if (!gold) {
      return skippedResult('No layout edit gold.');
    }
    const { before, dashboard, steps = [] } = output;
    // Without a write the result is the seed itself, which would pass every preservation check.
    if (!dashboard || getLastWrittenDashboardId(steps) === undefined) {
      return noDashboardResult;
    }
    if (!before) {
      return skippedResult('The seeded dashboard was not read back.');
    }

    const seed = indexLayout(before);
    const result = indexLayout(dashboard);
    const checks = [
      checkPanelsKept(gold, seed, result),
      ...checkStableContainers(gold, seed, result),
      checkOuterOrder(seed, result),
      ...checkCollapsed(seed, result),
      ...(gold.placements ?? []).map((placement, index) =>
        checkPlacement(placement, index, seed, result)
      ),
    ];
    return scoreChecks(checks, { subject: 'layout edit', passLabel: 'match' });
  },
};
