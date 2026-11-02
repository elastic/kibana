/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
  DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import { getControlId, getSectionsById, indexPanelsById } from './dashboard_state';
import { DASHBOARD_FAILURE_TYPES, type DashboardFailureKind } from './failure_types';
import type { DashboardFailure } from './utils';

export interface DashboardValidationIssue {
  /** Location of the invalid value in the dashboard payload, e.g. `['time_range', 'from']`. */
  path: ReadonlyArray<PropertyKey>;
  message: string;
}

/** Validates a dashboard against the host's dashboard schema. */
export interface DashboardValidator {
  /** Returns the problems of a panel, empty when the panel is valid. */
  validatePanel: (panel: AttachmentPanel) => string[];
  /** Validates the dashboard without the content of its panels. */
  validateDashboardFields: (dashboardData: DashboardAttachmentData) => DashboardValidationIssue[];
}

type DashboardField = Exclude<keyof DashboardAttachmentData, 'panels'>;

type Control = NonNullable<DashboardAttachmentData['pinned_panels']>[number];

interface ValidationResult {
  dashboardData: DashboardAttachmentData;
  failures: DashboardFailure[];
  /** Ids of panels that were dropped or restored. */
  discardedPanelIds: ReadonlySet<string>;
}

const MAX_REPORTED_ISSUES = 10;

const toFailure = (
  kind: DashboardFailureKind,
  identifier: string,
  messages: string[],
  outcome: string
): DashboardFailure => {
  const reportedMessages = messages.slice(0, MAX_REPORTED_ISSUES);
  if (messages.length > MAX_REPORTED_ISSUES) {
    reportedMessages.push(`and ${messages.length - MAX_REPORTED_ISSUES} more`);
  }
  return {
    type: DASHBOARD_FAILURE_TYPES.validateDashboard,
    kind,
    identifier,
    error: `${outcome} because the result does not match the dashboard schema: ${reportedMessages.join(
      '; '
    )}`,
  };
};

/** Formats issues with paths relative to the first `pathOffset` path segments. */
const formatIssues = (issues: DashboardValidationIssue[], pathOffset: number): string[] =>
  issues.map(({ path, message }) => {
    const relativePath = path.slice(pathOffset).map(String).join('.');
    return relativePath ? `${relativePath}: ${message}` : message;
  });

const appendIssue = <Key>(
  issuesByKey: Map<Key, DashboardValidationIssue[]>,
  key: Key,
  issue: DashboardValidationIssue
) => issuesByKey.set(key, [...(issuesByKey.get(key) ?? []), issue]);

/** Restores a dashboard field, removing it when the original dashboard did not have it. */
const restoreField = (
  dashboardData: DashboardAttachmentData,
  originalDashboardData: DashboardAttachmentData,
  field: DashboardField
): DashboardAttachmentData => {
  if (field === 'title' || field in originalDashboardData) {
    return { ...dashboardData, [field]: originalDashboardData[field] };
  }
  const { [field]: removedValue, ...restoredDashboardData } = dashboardData;
  return restoredDashboardData;
};

/**
 * Discards the changes that make the dashboard invalid, one panel, control or dashboard field at a
 * time: a new invalid one is dropped and a changed invalid one is restored. Anything that is the
 * same as before this call is kept even when invalid, so existing invalid content never blocks an
 * update. An issue that belongs to none of them discards every change.
 */
export const discardInvalidChanges = ({
  originalDashboardData,
  dashboardData,
  validator: { validatePanel, validateDashboardFields },
}: {
  originalDashboardData: DashboardAttachmentData;
  dashboardData: DashboardAttachmentData;
  validator: DashboardValidator;
}): ValidationResult => {
  const originalControls = originalDashboardData.pinned_panels ?? [];
  // Controls get an id when added; matching by content covers controls stored without one.
  const findOriginalControl = (control: Control): Control | undefined => {
    const id = getControlId(control);
    return originalControls.find((originalControl) =>
      id === undefined ? isEqual(originalControl, control) : getControlId(originalControl) === id
    );
  };

  const dashboardIssues: DashboardValidationIssue[] = [];
  const controlIssues = new Map<Control, DashboardValidationIssue[]>();
  const fieldIssues = new Map<DashboardField, DashboardValidationIssue[]>();
  for (const issue of validateDashboardFields(dashboardData)) {
    const [field, controlIndex] = issue.path;
    const control =
      field === 'pinned_panels' && typeof controlIndex === 'number'
        ? dashboardData.pinned_panels?.[controlIndex]
        : undefined;
    if (control) {
      if (!isEqual(control, findOriginalControl(control))) {
        appendIssue(controlIssues, control, issue);
      }
    } else if (typeof field === 'string' && field !== 'panels') {
      const dashboardField = field as DashboardField;
      if (!isEqual(dashboardData[dashboardField], originalDashboardData[dashboardField])) {
        appendIssue(fieldIssues, dashboardField, issue);
      }
    } else {
      dashboardIssues.push(issue);
    }
  }

  if (dashboardIssues.length > 0) {
    return {
      dashboardData: originalDashboardData,
      failures: [
        toFailure(
          'dashboard',
          'dashboard',
          formatIssues(dashboardIssues, 0),
          'All changes were discarded'
        ),
      ],
      discardedPanelIds: new Set(indexPanelsById(dashboardData.panels).keys()),
    };
  }

  const originalPanelsById = indexPanelsById(originalDashboardData.panels);
  const originalSectionsById = getSectionsById(originalDashboardData);

  const failures: DashboardFailure[] = [];
  const discardedPanelIds = new Set<string>();

  const resolvePanel = (panel: AttachmentPanel): AttachmentPanel[] => {
    const originalPanel = originalPanelsById.get(panel.id);
    const hasSameContent =
      originalPanel?.type === panel.type && isEqual(originalPanel.config, panel.config);
    const problems = hasSameContent ? [] : validatePanel(panel);
    if (problems.length === 0) {
      return [panel];
    }

    discardedPanelIds.add(panel.id);
    if (!originalPanel) {
      failures.push(toFailure('panel', panel.id, problems, 'Panel was not added'));
      return [];
    }
    failures.push(
      toFailure('panel', panel.id, problems, 'Panel was reverted to its state before this call')
    );
    // Keep the new position, so a panel moved into or out of a section stays where it was moved.
    return [{ ...originalPanel, grid: panel.grid }];
  };

  const resolveSection = (section: DashboardSection): DashboardAttachmentData['panels'] => {
    const sectionPanels = section.panels.flatMap(resolvePanel);
    if (
      !originalSectionsById.has(section.id) &&
      section.panels.length > 0 &&
      sectionPanels.length === 0
    ) {
      failures.push({
        type: DASHBOARD_FAILURE_TYPES.validateDashboard,
        kind: 'section',
        identifier: section.id,
        error: `Section "${section.title}" was not added because none of its panels are valid.`,
      });
      return [];
    }
    return [{ ...section, panels: sectionPanels }];
  };

  let nextDashboardData: DashboardAttachmentData = {
    ...dashboardData,
    panels: dashboardData.panels.flatMap((widget) =>
      isSection(widget) ? resolveSection(widget) : resolvePanel(widget)
    ),
  };

  if (controlIssues.size > 0) {
    const controls = (dashboardData.pinned_panels ?? []).flatMap((control, controlIndex) => {
      const issues = controlIssues.get(control);
      if (!issues) {
        return [control];
      }
      const originalControl = findOriginalControl(control);
      failures.push(
        toFailure(
          'control',
          getControlId(control) ?? `pinned_panels[${controlIndex}]`,
          formatIssues(issues, 2),
          originalControl
            ? 'Control was reverted to its state before this call'
            : 'Control was not added'
        )
      );
      return originalControl ? [originalControl] : [];
    });
    nextDashboardData =
      controls.length === 0 && !originalDashboardData.pinned_panels
        ? restoreField(nextDashboardData, originalDashboardData, 'pinned_panels')
        : { ...nextDashboardData, pinned_panels: controls };
  }

  for (const [field, issues] of fieldIssues) {
    nextDashboardData = restoreField(nextDashboardData, originalDashboardData, field);
    failures.push(
      toFailure('dashboard', field, formatIssues(issues, 1), `Change to "${field}" was reverted`)
    );
  }

  return { dashboardData: nextDashboardData, failures, discardedPanelIds };
};
