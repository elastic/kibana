/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { DashboardValidationIssue, ValidateDashboard } from '@kbn/dashboard-authoring';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';

type DashboardStateSchema = ReturnType<DashboardPluginStart['getDashboardStateSchema']>;
type IssuePath = DashboardValidationIssue['path'];

const getDeepestPathLength = (issues: z.core.$ZodIssue[]): number =>
  Math.max(0, ...issues.map(({ path }) => path.length));

/**
 * Picks the union option the value most likely targeted: the one that got furthest into the value
 * before failing, then the one with the fewest issues.
 */
const getClosestUnionOption = (options: z.core.$ZodIssue[][]): z.core.$ZodIssue[] =>
  options.reduce((closest, option) => {
    const depthDifference = getDeepestPathLength(option) - getDeepestPathLength(closest);
    return depthDifference > 0 || (depthDifference === 0 && option.length < closest.length)
      ? option
      : closest;
  });

const toValidationIssues = (
  issues: z.core.$ZodIssue[],
  basePath: IssuePath = []
): DashboardValidationIssue[] =>
  issues.flatMap((issue) => {
    const path = [...basePath, ...issue.path];
    if (issue.code === 'invalid_union' && issue.errors.length > 0) {
      return toValidationIssues(getClosestUnionOption(issue.errors), path);
    }
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({ path: [...path, key], message: 'Unrecognized key' }));
    }
    return [{ path, message: issue.message }];
  });

const getPanelLocations = ({
  panels,
}: DashboardAttachmentData): Array<{ panel: AttachmentPanel; path: IssuePath }> =>
  panels.flatMap((widget, widgetIndex) =>
    isSection(widget)
      ? widget.panels.map((panel, panelIndex) => ({
          panel,
          path: ['panels', widgetIndex, 'panels', panelIndex],
        }))
      : [{ panel: widget, path: ['panels', widgetIndex] }]
  );

const isPathEqual = (path: IssuePath, otherPath: IssuePath): boolean =>
  path.length === otherPath.length && path.every((key, index) => otherPath[index] === key);

/**
 * Validates the whole dashboard against the strict as-code dashboard schema the dashboard API
 * uses, so generated dashboards stay valid as-code dashboards.
 *
 * The vega plugin only registers its panel schema while `vega.standaloneEmbeddable` is enabled, so
 * the unregistered-type issue on vega panels is ignored; once registered, vega panels are
 * validated like any other panel.
 */
export const createDashboardValidator =
  (dashboardStateSchema: DashboardStateSchema): ValidateDashboard =>
  (dashboardData) => {
    const result = dashboardStateSchema.safeParse(dashboardData);
    if (result.success) {
      return [];
    }

    const vegaTypePaths = getPanelLocations(dashboardData)
      .filter(({ panel }) => panel.type === VEGA_VIS_TYPE)
      .map(({ path }) => [...path, 'type']);

    return toValidationIssues(result.error.issues).filter(
      ({ path }) => !vegaTypePaths.some((vegaTypePath) => isPathEqual(path, vegaTypePath))
    );
  };
