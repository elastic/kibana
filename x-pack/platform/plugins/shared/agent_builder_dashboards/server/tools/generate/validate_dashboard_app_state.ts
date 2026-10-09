/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import type { z } from '@kbn/zod';
import { getDashboardDataSchema } from '@kbn/as-code-dashboard-schema';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import type { DashboardValidationIssue, ValidateDashboard } from '@kbn/dashboard-agent-authoring';

type IssuePath = DashboardValidationIssue['path'];

// Panels are loose objects in the dashboard application schema, so embeddable schemas are not needed.
const getDashboardAppStateSchema = once(() =>
  getDashboardDataSchema({}, { isDashboardAppRequest: true })
);

const MAX_UNION_MESSAGE_LENGTH = 1000;

const formatNestedIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.map(String).join('.');
  const message = formatIssueMessage(issue);
  return path ? `${path}: ${message}` : message;
};

/** Lists the issues of every union option, since Zod only reports "Invalid input" for a union. */
const formatIssueMessage = (issue: z.core.$ZodIssue): string => {
  if (issue.code === 'invalid_union' && issue.errors.length > 0) {
    const options = issue.errors.map(
      (optionIssues) => `(${optionIssues.map(formatNestedIssue).join(', ')})`
    );
    const message = `No union option matched: ${options.join(' | ')}`;
    return message.length > MAX_UNION_MESSAGE_LENGTH
      ? `${message.slice(0, MAX_UNION_MESSAGE_LENGTH)}…`
      : message;
  }
  if (issue.code === 'unrecognized_keys') {
    return `Unrecognized keys: ${issue.keys.join(', ')}`;
  }
  return issue.message;
};

const toValidationIssues = (
  issues: z.core.$ZodIssue[],
  basePath: IssuePath = []
): DashboardValidationIssue[] =>
  issues.flatMap((issue) => {
    const path = [...basePath, ...issue.path];
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({ path: [...path, key], message: 'Unrecognized key' }));
    }
    return [{ path, message: formatIssueMessage(issue) }];
  });

const getPanelLocations = (
  widgets: DashboardAttachmentData['panels']
): Array<{ panel: AttachmentPanel; path: IssuePath }> =>
  widgets.flatMap((widget, widgetIndex) =>
    isSection(widget)
      ? widget.panels.map((panel, panelIndex) => ({
          panel,
          path: ['panels', widgetIndex, 'panels', panelIndex],
        }))
      : [{ panel: widget, path: ['panels', widgetIndex] }]
  );

/**
 * Validates a dashboard the way the dashboard application validates it on save: dashboard fields
 * against the dashboard application schema, then each panel config against the schema of its type.
 * Panels of a type without a schema are not validated.
 */
export const createDashboardAppStateValidator =
  ({ getTransforms }: Pick<EmbeddableStart, 'getTransforms'>): ValidateDashboard =>
  (dashboardData) => {
    const stateResult = getDashboardAppStateSchema().safeParse(dashboardData);
    const stateIssues = stateResult.success ? [] : toValidationIssues(stateResult.error.issues);

    const panelIssues = getPanelLocations(dashboardData.panels).flatMap(
      ({ panel: { type, config }, path }) => {
        const transformType = type === LENS_EMBEDDABLE_TYPE ? 'lens-dashboard-app' : type;
        const configResult = getTransforms(transformType)?.schema?.safeParse(config);
        return configResult?.success === false
          ? toValidationIssues(configResult.error.issues, [...path, 'config'])
          : [];
      }
    );

    return [...stateIssues, ...panelIssues];
  };
