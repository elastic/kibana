/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import { indexPanelsById } from './dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from './failure_types';
import type { OperationFailure } from './utils';

export interface DashboardValidationIssue {
  /** Location of the invalid value in the dashboard payload, e.g. `['panels', 0, 'config']`. */
  path: ReadonlyArray<PropertyKey>;
  message: string;
}

/**
 * Validates a whole dashboard payload against the host's dashboard schema, returning one issue per
 * invalid location (empty when the dashboard is valid).
 */
export type ValidateDashboard = (
  dashboardData: DashboardAttachmentData
) => DashboardValidationIssue[];

type DashboardField = Exclude<keyof DashboardAttachmentData, 'panels'>;

const TOP_LEVEL_PANEL_PATH_LENGTH = 2;
const SECTION_PANEL_PATH_LENGTH = 4;

const getIssuePanel = (
  dashboardData: DashboardAttachmentData,
  [, widgetIndex, sectionKey, panelIndex]: ReadonlyArray<PropertyKey>
): { panel: AttachmentPanel; pathLength: number } | undefined => {
  const widget = typeof widgetIndex === 'number' ? dashboardData.panels[widgetIndex] : undefined;
  if (!widget) {
    return undefined;
  }
  if (!isSection(widget)) {
    return { panel: widget, pathLength: TOP_LEVEL_PANEL_PATH_LENGTH };
  }
  const sectionPanel =
    sectionKey === 'panels' && typeof panelIndex === 'number'
      ? widget.panels[panelIndex]
      : undefined;
  return sectionPanel && { panel: sectionPanel, pathLength: SECTION_PANEL_PATH_LENGTH };
};

const formatIssue = ({ path, message }: DashboardValidationIssue, locationPathLength: number) => {
  const relativePath = path.slice(locationPathLength).map(String).join('.');
  return relativePath ? `${relativePath}: ${message}` : message;
};

const isDashboardField = (
  dashboardData: DashboardAttachmentData,
  key: PropertyKey | undefined
): key is DashboardField => typeof key === 'string' && key !== 'panels' && key in dashboardData;

const hasChangedContent = (panel: AttachmentPanel, originalPanel?: AttachmentPanel): boolean =>
  !originalPanel || originalPanel.type !== panel.type || originalPanel.config !== panel.config;

const appendTo = <TKey>(map: Map<TKey, string[]>, key: TKey, message: string) => {
  map.set(key, [...(map.get(key) ?? []), message]);
};

const toFailure = (identifier: string, messages: string[], outcome: string): OperationFailure => ({
  type: DASHBOARD_OPERATION_FAILURE_TYPES.validateDashboard,
  identifier,
  error: `${outcome} because it does not match the dashboard schema: ${messages.join('; ')}`,
});

const discardInvalidPanels = ({
  originalDashboardData,
  dashboardData,
  issues,
}: {
  originalDashboardData: DashboardAttachmentData;
  dashboardData: DashboardAttachmentData;
  issues: DashboardValidationIssue[];
}): { panels: DashboardAttachmentData['panels']; failures: OperationFailure[] } => {
  const originalPanelsById = indexPanelsById(originalDashboardData.panels);
  const messagesByPanel = new Map<AttachmentPanel, string[]>();

  for (const issue of issues) {
    const issuePanel =
      issue.path[0] === 'panels' ? getIssuePanel(dashboardData, issue.path) : undefined;
    if (
      issuePanel &&
      hasChangedContent(issuePanel.panel, originalPanelsById.get(issuePanel.panel.id))
    ) {
      appendTo(messagesByPanel, issuePanel.panel, formatIssue(issue, issuePanel.pathLength));
    }
  }

  const failures: OperationFailure[] = [];
  const restorePanel = (panel: AttachmentPanel): AttachmentPanel[] => {
    const messages = messagesByPanel.get(panel);
    if (!messages) {
      return [panel];
    }

    const originalPanel = originalPanelsById.get(panel.id);
    if (!originalPanel) {
      failures.push(toFailure(panel.id, messages, 'Panel was not added'));
      return [];
    }

    failures.push(toFailure(panel.id, messages, 'Panel edit was reverted'));
    return [{ ...panel, type: originalPanel.type, config: originalPanel.config }];
  };

  const panels = dashboardData.panels.flatMap((widget): DashboardAttachmentData['panels'] =>
    isSection(widget)
      ? [{ ...widget, panels: widget.panels.flatMap(restorePanel) }]
      : restorePanel(widget)
  );

  return { panels, failures };
};

const discardInvalidFields = ({
  originalDashboardData,
  dashboardData,
  issues,
}: {
  originalDashboardData: DashboardAttachmentData;
  dashboardData: DashboardAttachmentData;
  issues: DashboardValidationIssue[];
}): { dashboardData: DashboardAttachmentData; failures: OperationFailure[] } => {
  const issuesByField = new Map<DashboardField, DashboardValidationIssue[]>();
  for (const issue of issues) {
    const [field] = issue.path;
    if (
      isDashboardField(dashboardData, field) &&
      dashboardData[field] !== originalDashboardData[field]
    ) {
      issuesByField.set(field, [...(issuesByField.get(field) ?? []), issue]);
    }
  }

  const failures: OperationFailure[] = [];
  let nextDashboardData = dashboardData;
  for (const [field, fieldIssues] of issuesByField) {
    const value = dashboardData[field];
    const originalValue = originalDashboardData[field];
    const messages = fieldIssues.map((issue) => formatIssue(issue, 1));
    const invalidItemIndexes = new Set(fieldIssues.map(({ path }) => path[1]));
    const originalItems = new Set<unknown>(Array.isArray(originalValue) ? originalValue : []);
    const onlyNewItemsAreInvalid =
      Array.isArray(value) &&
      [...invalidItemIndexes].every(
        (index) => typeof index === 'number' && !originalItems.has(value[index])
      );

    if (onlyNewItemsAreInvalid) {
      nextDashboardData = {
        ...nextDashboardData,
        [field]: value.filter((_, index) => !invalidItemIndexes.has(index)),
      };
      failures.push(toFailure(field, messages, `New "${field}" items were not added`));
      continue;
    }

    nextDashboardData = { ...nextDashboardData, [field]: originalValue };
    failures.push(toFailure(field, messages, `Change to "${field}" was reverted`));
  }

  return { dashboardData: nextDashboardData, failures };
};

/**
 * Discards the changes behind validation issues so only valid writes are kept: invalid new panels
 * and items are dropped, and invalid edits get their original value back. Issues in content the
 * operations did not change are ignored, so pre-existing invalid content never blocks an update.
 */
export const discardInvalidChanges = ({
  originalDashboardData,
  dashboardData,
  issues,
}: {
  originalDashboardData: DashboardAttachmentData;
  dashboardData: DashboardAttachmentData;
  issues: DashboardValidationIssue[];
}): { dashboardData: DashboardAttachmentData; failures: OperationFailure[] } => {
  if (issues.length === 0) {
    return { dashboardData, failures: [] };
  }

  const panelResult = discardInvalidPanels({ originalDashboardData, dashboardData, issues });
  const fieldResult = discardInvalidFields({ originalDashboardData, dashboardData, issues });

  return {
    dashboardData: { ...fieldResult.dashboardData, panels: panelResult.panels },
    failures: [...panelResult.failures, ...fieldResult.failures],
  };
};
