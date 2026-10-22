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
import { DASHBOARD_FAILURE_TYPES } from './failure_types';
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

const toFailure = (identifier: string, messages: string[], outcome: string): DashboardFailure => {
  const reportedMessages = messages.slice(0, MAX_REPORTED_ISSUES);
  if (messages.length > MAX_REPORTED_ISSUES) {
    reportedMessages.push(`and ${messages.length - MAX_REPORTED_ISSUES} more`);
  }
  return {
    type: DASHBOARD_FAILURE_TYPES.validateDashboard,
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

/** Names a panel by its title when it has one, since the agent never saw the id of a new panel. */
const getPanelIdentifier = ({ id, config: { title } }: AttachmentPanel): string =>
  typeof title === 'string' && title ? `"${title}" (${id})` : id;

const getAllPanels = (panels: DashboardAttachmentData['panels']): AttachmentPanel[] =>
  panels.flatMap((widget) => (isSection(widget) ? widget.panels : [widget]));

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
  const findOriginalControl = (control: Control): Control | undefined =>
    originalControls.find((originalControl) =>
      control.id === undefined
        ? isEqual(originalControl, control)
        : originalControl.id === control.id
    );

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
        toFailure('dashboard', formatIssues(dashboardIssues, 0), 'All changes were discarded'),
      ],
      discardedPanelIds: new Set(getAllPanels(dashboardData.panels).map(({ id }) => id)),
    };
  }

  const originalPanelsById = new Map(
    getAllPanels(originalDashboardData.panels).map((panel) => [panel.id, panel])
  );
  const originalSectionIds = new Set(
    originalDashboardData.panels.filter(isSection).map(({ id }) => id)
  );

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
      failures.push(toFailure(getPanelIdentifier(panel), problems, 'Panel was not added'));
      return [];
    }
    failures.push(
      toFailure(
        getPanelIdentifier(panel),
        problems,
        'Panel was reverted to its state before this call'
      )
    );
    // Keep the new position, so a panel moved into or out of a section stays where it was moved.
    return [{ ...originalPanel, grid: panel.grid }];
  };

  const resolveSection = (section: DashboardSection): DashboardAttachmentData['panels'] => {
    const sectionPanels = section.panels.flatMap(resolvePanel);
    if (
      !originalSectionIds.has(section.id) &&
      section.panels.length > 0 &&
      sectionPanels.length === 0
    ) {
      failures.push({
        type: DASHBOARD_FAILURE_TYPES.validateDashboard,
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
    const controls = (dashboardData.pinned_panels ?? []).flatMap((control) => {
      if (!controlIssues.has(control)) {
        return [control];
      }
      const originalControl = findOriginalControl(control);
      return originalControl ? [originalControl] : [];
    });
    nextDashboardData =
      controls.length === 0 && !originalDashboardData.pinned_panels
        ? restoreField(nextDashboardData, originalDashboardData, 'pinned_panels')
        : { ...nextDashboardData, pinned_panels: controls };
    failures.push(
      toFailure(
        'pinned_panels',
        formatIssues([...controlIssues.values()].flat(), 1),
        'Invalid control changes were discarded'
      )
    );
  }

  for (const [field, issues] of fieldIssues) {
    nextDashboardData = restoreField(nextDashboardData, originalDashboardData, field);
    failures.push(toFailure(field, formatIssues(issues, 1), `Change to "${field}" was reverted`));
  }

  return { dashboardData: nextDashboardData, failures, discardedPanelIds };
};
