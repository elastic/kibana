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

interface ValidationResult {
  dashboardData: DashboardAttachmentData;
  failures: OperationFailure[];
  /** Ids of panels that were dropped or whose content was reverted. */
  discardedPanelIds: ReadonlySet<string>;
}

const TOP_LEVEL_PANEL_PATH_LENGTH = 2;
const SECTION_PANEL_PATH_LENGTH = 4;
const FIELD_PATH_LENGTH = 1;

const getIssuePanel = (
  dashboardData: DashboardAttachmentData,
  [location, widgetIndex, sectionKey, panelIndex]: ReadonlyArray<PropertyKey>
): { panel: AttachmentPanel; pathLength: number } | undefined => {
  const widget =
    location === 'panels' && typeof widgetIndex === 'number'
      ? dashboardData.panels[widgetIndex]
      : undefined;
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

const isDashboardField = (
  dashboardData: DashboardAttachmentData,
  key: PropertyKey | undefined
): key is DashboardField => typeof key === 'string' && key !== 'panels' && key in dashboardData;

const formatIssue = ({ path, message }: DashboardValidationIssue, locationPathLength = 0) => {
  const relativePath = path.slice(locationPathLength).map(String).join('.');
  return relativePath ? `${relativePath}: ${message}` : message;
};

/**
 * Identifies an issue that cannot be attributed to a single panel or field, keying section issues
 * by section id so they still match after sections move.
 */
const getDashboardIssueKey = (
  dashboardData: DashboardAttachmentData,
  issue: DashboardValidationIssue
): string => {
  const [location, widgetIndex] = issue.path;
  const widget =
    location === 'panels' && typeof widgetIndex === 'number'
      ? dashboardData.panels[widgetIndex]
      : undefined;
  return widget && isSection(widget)
    ? `section ${widget.id} ${formatIssue(issue, TOP_LEVEL_PANEL_PATH_LENGTH)}`
    : formatIssue(issue);
};

const hasChangedContent = (panel: AttachmentPanel, originalPanel?: AttachmentPanel): boolean =>
  !originalPanel || originalPanel.type !== panel.type || originalPanel.config !== panel.config;

const appendTo = <TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue) => {
  map.set(key, [...(map.get(key) ?? []), value]);
};

const toFailure = (identifier: string, messages: string[], outcome: string): OperationFailure => ({
  type: DASHBOARD_OPERATION_FAILURE_TYPES.validateDashboard,
  identifier,
  error: `${outcome} because the result does not match the dashboard schema: ${messages.join(
    '; '
  )}`,
});

const getPanelIds = (panels: DashboardAttachmentData['panels']): Set<string> =>
  new Set(indexPanelsById(panels).keys());

const discardInvalidPanels = ({
  originalDashboardData,
  dashboardData,
  messagesByPanel,
}: {
  originalDashboardData: DashboardAttachmentData;
  dashboardData: DashboardAttachmentData;
  messagesByPanel: Map<AttachmentPanel, string[]>;
}): Omit<ValidationResult, 'dashboardData'> & { panels: DashboardAttachmentData['panels'] } => {
  const originalPanelsById = indexPanelsById(originalDashboardData.panels);
  const originalSectionIds = new Set(
    originalDashboardData.panels.filter(isSection).map(({ id }) => id)
  );
  const failures: OperationFailure[] = [];
  const discardedPanelIds = new Set<string>();

  const restorePanel = (panel: AttachmentPanel): AttachmentPanel[] => {
    const messages = messagesByPanel.get(panel);
    if (!messages) {
      return [panel];
    }

    discardedPanelIds.add(panel.id);
    const originalPanel = originalPanelsById.get(panel.id);
    if (!originalPanel) {
      failures.push(toFailure(panel.id, messages, 'Panel was not added'));
      return [];
    }

    failures.push(toFailure(panel.id, messages, 'Panel edit was reverted'));
    return [{ ...panel, type: originalPanel.type, config: originalPanel.config }];
  };

  const panels = dashboardData.panels.flatMap((widget): DashboardAttachmentData['panels'] => {
    if (!isSection(widget)) {
      return restorePanel(widget);
    }

    const sectionPanels = widget.panels.flatMap(restorePanel);
    const isNewSectionLeftEmpty =
      !originalSectionIds.has(widget.id) && widget.panels.length > 0 && sectionPanels.length === 0;
    if (isNewSectionLeftEmpty) {
      failures.push({
        type: DASHBOARD_OPERATION_FAILURE_TYPES.validateDashboard,
        identifier: widget.id,
        error: `Section "${widget.title}" was not added because none of its panels are valid.`,
      });
      return [];
    }
    return [{ ...widget, panels: sectionPanels }];
  });

  return { panels, failures, discardedPanelIds };
};

const discardInvalidFields = ({
  originalDashboardData,
  dashboardData,
  issuesByField,
}: {
  originalDashboardData: DashboardAttachmentData;
  dashboardData: DashboardAttachmentData;
  issuesByField: Map<DashboardField, DashboardValidationIssue[]>;
}): Pick<ValidationResult, 'dashboardData' | 'failures'> => {
  const failures: OperationFailure[] = [];
  let nextDashboardData = dashboardData;

  for (const [field, fieldIssues] of issuesByField) {
    const value = dashboardData[field];
    const messages = fieldIssues.map((issue) => formatIssue(issue, FIELD_PATH_LENGTH));
    const invalidItemIndexes = new Set(fieldIssues.map(({ path }) => path[1]));
    const onlyItemsAreInvalid =
      Array.isArray(value) &&
      fieldIssues.every(
        ({ path }) => path.length > FIELD_PATH_LENGTH && typeof path[1] === 'number'
      );

    if (onlyItemsAreInvalid) {
      nextDashboardData = {
        ...nextDashboardData,
        [field]: value.filter((_, index) => !invalidItemIndexes.has(index)),
      };
      failures.push(toFailure(field, messages, `New "${field}" items were not added`));
      continue;
    }

    nextDashboardData = { ...nextDashboardData, [field]: originalDashboardData[field] };
    failures.push(toFailure(field, messages, `Change to "${field}" was reverted`));
  }

  return { dashboardData: nextDashboardData, failures };
};

/**
 * Discards the changes behind validation issues so only valid writes are kept: invalid new panels
 * and items are dropped, and invalid edits get their original value back. Issues in content the
 * operations did not change are ignored, so pre-existing invalid content never blocks an update.
 * New issues that belong to no single panel or field (e.g. section or panel count issues) discard
 * every change.
 */
export const discardInvalidChanges = ({
  originalDashboardData,
  dashboardData,
  validateDashboard,
}: {
  originalDashboardData: DashboardAttachmentData;
  dashboardData: DashboardAttachmentData;
  validateDashboard: ValidateDashboard;
}): ValidationResult => {
  const issues = validateDashboard(dashboardData);
  if (issues.length === 0) {
    return { dashboardData, failures: [], discardedPanelIds: new Set() };
  }

  const originalPanelsById = indexPanelsById(originalDashboardData.panels);
  const messagesByPanel = new Map<AttachmentPanel, string[]>();
  const issuesByField = new Map<DashboardField, DashboardValidationIssue[]>();
  const dashboardIssues: DashboardValidationIssue[] = [];

  for (const issue of issues) {
    const issuePanel = getIssuePanel(dashboardData, issue.path);
    if (issuePanel) {
      if (hasChangedContent(issuePanel.panel, originalPanelsById.get(issuePanel.panel.id))) {
        appendTo(messagesByPanel, issuePanel.panel, formatIssue(issue, issuePanel.pathLength));
      }
      continue;
    }

    const [field, itemIndex] = issue.path;
    if (!isDashboardField(dashboardData, field)) {
      dashboardIssues.push(issue);
      continue;
    }

    const value = dashboardData[field];
    const originalValue = originalDashboardData[field];
    const isOriginalItem =
      Array.isArray(value) &&
      Array.isArray(originalValue) &&
      typeof itemIndex === 'number' &&
      issue.path.length > FIELD_PATH_LENGTH &&
      new Set<unknown>(originalValue).has(value[itemIndex]);
    if (value !== originalValue && !isOriginalItem) {
      appendTo(issuesByField, field, issue);
    }
  }

  if (dashboardIssues.length > 0) {
    const originalIssueKeys = new Set(
      validateDashboard(originalDashboardData).map((issue) =>
        getDashboardIssueKey(originalDashboardData, issue)
      )
    );
    const newDashboardIssues = dashboardIssues.filter(
      (issue) => !originalIssueKeys.has(getDashboardIssueKey(dashboardData, issue))
    );
    if (newDashboardIssues.length > 0) {
      return {
        dashboardData: originalDashboardData,
        failures: [
          toFailure(
            'dashboard',
            newDashboardIssues.map((issue) => formatIssue(issue)),
            'All changes were discarded'
          ),
        ],
        discardedPanelIds: getPanelIds(dashboardData.panels),
      };
    }
  }

  const panelResult = discardInvalidPanels({
    originalDashboardData,
    dashboardData,
    messagesByPanel,
  });
  const fieldResult = discardInvalidFields({
    originalDashboardData,
    dashboardData,
    issuesByField,
  });

  return {
    dashboardData: { ...fieldResult.dashboardData, panels: panelResult.panels },
    failures: [...panelResult.failures, ...fieldResult.failures],
    discardedPanelIds: panelResult.discardedPanelIds,
  };
};
