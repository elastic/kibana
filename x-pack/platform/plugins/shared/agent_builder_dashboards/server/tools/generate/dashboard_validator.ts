/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
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

/**
 * Mirrors the `config` of the native vega embeddable schema, which the vega plugin only registers
 * while `vega.standaloneEmbeddable` is enabled. Remove once that flag is on by default.
 */
const vegaConfigSchema = z.looseObject({
  spec: z.discriminatedUnion('format', [
    z.object({ format: z.literal('hjson'), value: z.string().min(1) }),
    z.object({ format: z.literal('json'), value: z.looseObject({}) }),
  ]),
});

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

const isWithin = (path: IssuePath, prefix: IssuePath): boolean =>
  prefix.every((key, index) => path[index] === key);

/**
 * Validates the whole dashboard against the strict as-code dashboard schema the dashboard API
 * uses, so generated dashboards stay valid as-code dashboards. Vega panels are checked against a
 * local mirror of the native vega schema.
 */
export const createDashboardValidator =
  (dashboardStateSchema: DashboardStateSchema): ValidateDashboard =>
  (dashboardData) => {
    const vegaPanelLocations = getPanelLocations(dashboardData).filter(
      ({ panel }) => panel.type === VEGA_VIS_TYPE
    );
    const result = dashboardStateSchema.safeParse(dashboardData);
    const schemaIssues = result.success ? [] : toValidationIssues(result.error.issues);

    return [
      ...schemaIssues.filter(
        ({ path }) => !vegaPanelLocations.some((location) => isWithin(path, location.path))
      ),
      ...vegaPanelLocations.flatMap(({ panel, path }) => {
        const vegaResult = vegaConfigSchema.safeParse(panel.config);
        return vegaResult.success
          ? []
          : toValidationIssues(vegaResult.error.issues, [...path, 'config']);
      }),
    ];
  };
