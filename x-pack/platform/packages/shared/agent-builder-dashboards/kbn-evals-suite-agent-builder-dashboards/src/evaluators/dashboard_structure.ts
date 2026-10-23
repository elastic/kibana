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
} from '@kbn/agent-builder-dashboards-common';
import {
  GRID_COLUMNS,
  formatGrid,
  getLeafPanels,
  getPanelContainers,
  getPanelKind,
} from '../dashboard_panels';
import type { DashboardAgentEvaluator, DashboardStructureGold } from '../types';
import { noDashboardResult, scoreChecks, skippedResult, type Check } from '../evaluator_utils';

export const DASHBOARD_STRUCTURE_EVALUATOR_NAME = 'Dashboard Structure';

const describeRange = ({ min, max }: { min?: number; max?: number }): string =>
  `${min ?? 0}–${max ?? '∞'}`;

type RowGold = NonNullable<DashboardStructureGold['rows']>[number];

/**
 * Checks each gold row against the panels of its kind and the row above it. A
 * row shares its top and height, so it leaves no gap above the next row. A
 * missing row also fails the row below it, which cannot be directly below it.
 */
const checkRows = (rows: readonly RowGold[], dashboard: DashboardAttachmentData): Check[] => {
  const containers = getPanelContainers(dashboard);
  let previous: { panels: AttachmentPanel[]; container: number } | undefined;

  return rows.map(({ kind, fullWidth = false }, index) => {
    const container = containers.findIndex(({ panels }) =>
      panels.some((panel) => getPanelKind(panel) === kind)
    );
    const rowPanels = getLeafPanels(dashboard).filter((panel) => getPanelKind(panel) === kind);
    const placed = rowPanels.map(({ id, grid }) => `${id} ${formatGrid(grid)}`);
    const [first] = rowPanels;
    const problems = compact([
      first === undefined ? `no ${kind} panel` : undefined,
      rowPanels.some(
        (panel) =>
          !containers[container]?.panels.includes(panel) ||
          panel.grid.y !== first?.grid.y ||
          panel.grid.h !== first?.grid.h
      )
        ? `${kind} panels are not in one row`
        : undefined,
      fullWidth && rowPanels.some(({ grid }) => grid.w !== GRID_COLUMNS)
        ? `${kind} panels are not full width`
        : undefined,
      previous &&
      first &&
      (previous.container !== container ||
        first.grid.y !== Math.max(...previous.panels.map(({ grid }) => grid.y + grid.h)))
        ? `${kind} row is not directly below rows[${index - 1}]`
        : undefined,
    ]);
    previous = { panels: rowPanels, container };

    return {
      assertion: `rows[${index}]`,
      passed: problems.length === 0,
      detail: `${
        problems.length === 0 ? `${kind} row as asked` : problems.join('; ')
      } (${placed.join(', ')})`,
    };
  });
};

const checkStructure = (
  gold: DashboardStructureGold,
  dashboard: DashboardAttachmentData
): Check[] => {
  const panels = getLeafPanels(dashboard);
  const sections = dashboard.panels.filter(isSection);
  const checks: Check[] = [];

  if (gold.panelCount) {
    const { min = 0, max = Infinity } = gold.panelCount;
    checks.push({
      assertion: 'panelCount',
      passed: panels.length >= min && panels.length <= max,
      detail: `expected ${describeRange(gold.panelCount)} panels, found ${panels.length}`,
    });
  }

  for (const [kind, expectedCount] of Object.entries(gold.panelKinds ?? {})) {
    const count = panels.filter((panel) => getPanelKind(panel) === kind).length;
    checks.push({
      assertion: `panelKinds.${kind}`,
      passed: count === expectedCount,
      detail: `expected ${expectedCount} ${kind} panel(s), found ${count}`,
    });
  }

  if (gold.sectionCount !== undefined) {
    checks.push({
      assertion: 'sectionCount',
      passed: sections.length === gold.sectionCount,
      detail: `expected ${gold.sectionCount} section(s), found ${sections.length}`,
    });
  }

  // Each gold section claims the first unclaimed section whose title and size fit.
  const claimed = new Set<number>();
  for (const [index, { titleIncludesAny, minPanels = 1 }] of (gold.sections ?? []).entries()) {
    const match = sections.findIndex(
      ({ title, panels: sectionPanels }, sectionIndex) =>
        !claimed.has(sectionIndex) &&
        titleIncludesAny.some((term) => title.toLowerCase().includes(term.toLowerCase())) &&
        sectionPanels.length >= minPanels
    );
    if (match !== -1) {
      claimed.add(match);
    }
    checks.push({
      assertion: `sections[${index}]`,
      passed: match !== -1,
      detail: `expected a section titled with one of [${titleIncludesAny.join(
        ', '
      )}] holding at least ${minPanels} panel(s); found [${sections
        .map(({ title, panels: sectionPanels }) => `"${title}" (${sectionPanels.length})`)
        .join(', ')}]`,
    });
  }

  checks.push(...checkRows(gold.rows ?? [], dashboard));

  return checks;
};

/**
 * Checks what the prompt pins down about the dashboard's shape: panel count,
 * panels per chart kind, named sections, and rows the prompt lays out. Scored
 * as the fraction of gold assertions that hold, so one miss does not zero the
 * example.
 */
export const dashboardStructureEvaluator: DashboardAgentEvaluator = {
  name: DASHBOARD_STRUCTURE_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ expected, output }) => {
    const gold = expected?.structure;
    if (!gold) {
      return skippedResult('No gold structure.');
    }
    const { dashboard } = output;
    if (!dashboard) {
      return noDashboardResult;
    }

    const checks = checkStructure(gold, dashboard);
    if (checks.length === 0) {
      return skippedResult('Gold structure declares no assertions.');
    }
    return scoreChecks(checks, { subject: 'structure', passLabel: 'match' });
  },
};
