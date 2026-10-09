/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentPanel,
  DashboardAttachmentData,
  DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
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

type PinnedPanel = NonNullable<DashboardAttachmentData['pinned_panels']>[number];

interface ValidationResult {
  dashboardData: DashboardAttachmentData;
  failures: OperationFailure[];
  /** Ids of panels that were dropped or restored. */
  discardedPanelIds: ReadonlySet<string>;
}

/**
 * The part of the dashboard an issue belongs to. Each unit is kept, dropped or restored as a
 * whole. `pathLength` is the length of the unit's own path, so messages can be shown relative to
 * the unit.
 */
type DashboardUnit =
  | { kind: 'panel'; key: string; pathLength: number; panel: AttachmentPanel }
  | { kind: 'pinnedPanel'; key: string; pathLength: number; pinnedPanel: PinnedPanel }
  | { kind: 'field'; key: string; pathLength: number; field: DashboardField }
  | { kind: 'dashboard'; key: string; pathLength: number };

interface InvalidUnit {
  unit: DashboardUnit;
  issues: DashboardValidationIssue[];
}

const TOP_LEVEL_WIDGET_PATH_LENGTH = 2;
const SECTION_PANEL_PATH_LENGTH = 4;
const FIELD_PATH_LENGTH = 1;

const getPinnedPanelKey = (pinnedPanel: PinnedPanel): string =>
  `pinned_panel:${JSON.stringify(pinnedPanel)}`;

const isDashboardField = (
  dashboardData: DashboardAttachmentData,
  key: PropertyKey | undefined
): key is DashboardField => typeof key === 'string' && key !== 'panels' && key in dashboardData;

/**
 * Finds the unit an issue path points into. Panels are keyed by id, so they match their original
 * after moving. Controls have no stable id and are keyed by content, which is enough because no
 * operation edits a control in place.
 */
const getIssueUnit = (
  dashboardData: DashboardAttachmentData,
  path: ReadonlyArray<PropertyKey>
): DashboardUnit => {
  const [location, index, sectionKey, sectionPanelIndex] = path;

  const widget =
    location === 'panels' && typeof index === 'number' ? dashboardData.panels[index] : undefined;
  const sectionPanel =
    widget && isSection(widget) && sectionKey === 'panels' && typeof sectionPanelIndex === 'number'
      ? widget.panels[sectionPanelIndex]
      : undefined;
  const panel = widget && !isSection(widget) ? widget : sectionPanel;
  if (panel) {
    return {
      kind: 'panel',
      key: `panel:${panel.id}`,
      pathLength: sectionPanel ? SECTION_PANEL_PATH_LENGTH : TOP_LEVEL_WIDGET_PATH_LENGTH,
      panel,
    };
  }

  const pinnedPanel =
    location === 'pinned_panels' && typeof index === 'number'
      ? dashboardData.pinned_panels?.[index]
      : undefined;
  if (pinnedPanel) {
    return {
      kind: 'pinnedPanel',
      key: getPinnedPanelKey(pinnedPanel),
      pathLength: FIELD_PATH_LENGTH,
      pinnedPanel,
    };
  }

  if (isDashboardField(dashboardData, location)) {
    return {
      kind: 'field',
      key: `field:${location}`,
      pathLength: FIELD_PATH_LENGTH,
      field: location,
    };
  }

  // Sections are keyed by id, so an issue in a moved section still matches its original. The
  // message is left out of the key because it can describe the current value.
  const keyPath = widget ? ['panels', widget.id, ...path.slice(2)] : path;
  return { kind: 'dashboard', key: `dashboard:${keyPath.map(String).join('.')}`, pathLength: 0 };
};

const getAllPanels = (panels: DashboardAttachmentData['panels']): AttachmentPanel[] =>
  panels.flatMap((widget) => (isSection(widget) ? widget.panels : [widget]));

/** Formats the issues of a unit, with paths relative to the unit unless `pathLength` is given. */
const formatIssues = (
  { unit, issues }: InvalidUnit,
  pathLength: number = unit.pathLength
): string[] =>
  issues.map(({ path, message }) => {
    const relativePath = path.slice(pathLength).map(String).join('.');
    return relativePath ? `${relativePath}: ${message}` : message;
  });

const MAX_REPORTED_ISSUES = 10;

const toFailure = (identifier: string, messages: string[], outcome: string): OperationFailure => {
  const reportedMessages = messages.slice(0, MAX_REPORTED_ISSUES);
  if (messages.length > MAX_REPORTED_ISSUES) {
    reportedMessages.push(`and ${messages.length - MAX_REPORTED_ISSUES} more`);
  }
  return {
    type: DASHBOARD_OPERATION_FAILURE_TYPES.validateDashboard,
    identifier,
    error: `${outcome} because the result does not match the dashboard schema: ${reportedMessages.join(
      '; '
    )}`,
  };
};

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
 * Groups issues by unit, leaving out units that were already invalid in the original dashboard:
 * the operations did not make those worse, so existing invalid content never blocks an update.
 */
const getNewInvalidUnits = (
  originalDashboardData: DashboardAttachmentData,
  dashboardData: DashboardAttachmentData,
  issues: DashboardValidationIssue[],
  validateDashboard: ValidateDashboard
): Map<string, InvalidUnit> => {
  const originalInvalidUnitKeys = new Set(
    validateDashboard(originalDashboardData).map(
      ({ path }) => getIssueUnit(originalDashboardData, path).key
    )
  );

  const newInvalidUnits = new Map<string, InvalidUnit>();
  for (const issue of issues) {
    const unit = getIssueUnit(dashboardData, issue.path);
    if (!originalInvalidUnitKeys.has(unit.key)) {
      const unitIssues = newInvalidUnits.get(unit.key)?.issues ?? [];
      newInvalidUnits.set(unit.key, { unit, issues: [...unitIssues, issue] });
    }
  }
  return newInvalidUnits;
};

/**
 * Discards the changes behind validation issues, one unit (panel, control or dashboard field) at a
 * time:
 * - a unit invalid only in the result is dropped when it is new, or restored to its original;
 * - a unit that was already invalid before the operations is kept as is;
 * - a new issue that belongs to no single unit (e.g. in a section) discards every change.
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
  const unchangedResult = { dashboardData, failures: [], discardedPanelIds: new Set<string>() };

  const issues = validateDashboard(dashboardData);
  if (issues.length === 0) {
    return unchangedResult;
  }

  const newInvalidUnits = getNewInvalidUnits(
    originalDashboardData,
    dashboardData,
    issues,
    validateDashboard
  );
  if (newInvalidUnits.size === 0) {
    return unchangedResult;
  }

  const dashboardInvalidUnits = [...newInvalidUnits.values()].filter(
    ({ unit }) => unit.kind === 'dashboard'
  );
  if (dashboardInvalidUnits.length > 0) {
    return {
      dashboardData: originalDashboardData,
      failures: [
        toFailure(
          'dashboard',
          dashboardInvalidUnits.flatMap((invalidUnit) => formatIssues(invalidUnit, 0)),
          'All changes were discarded'
        ),
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

  const failures: OperationFailure[] = [];
  const discardedPanelIds = new Set<string>();

  const resolvePanel = (panel: AttachmentPanel): AttachmentPanel[] => {
    const invalidUnit = newInvalidUnits.get(`panel:${panel.id}`);
    if (!invalidUnit) {
      return [panel];
    }

    discardedPanelIds.add(panel.id);
    const originalPanel = originalPanelsById.get(panel.id);
    if (!originalPanel) {
      failures.push(toFailure(panel.id, formatIssues(invalidUnit), 'Panel was not added'));
      return [];
    }

    failures.push(
      toFailure(
        panel.id,
        formatIssues(invalidUnit),
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
        type: DASHBOARD_OPERATION_FAILURE_TYPES.validateDashboard,
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

  const invalidPinnedPanels = [...newInvalidUnits.values()].filter(
    ({ unit }) => unit.kind === 'pinnedPanel'
  );
  if (invalidPinnedPanels.length > 0) {
    const invalidPinnedPanelKeys = new Set(invalidPinnedPanels.map(({ unit }) => unit.key));
    nextDashboardData = {
      ...nextDashboardData,
      pinned_panels: dashboardData.pinned_panels?.filter(
        (pinnedPanel) => !invalidPinnedPanelKeys.has(getPinnedPanelKey(pinnedPanel))
      ),
    };
    failures.push(
      toFailure(
        'pinned_panels',
        invalidPinnedPanels.flatMap((invalidUnit) => formatIssues(invalidUnit)),
        'New controls were not added'
      )
    );
  }

  for (const invalidUnit of newInvalidUnits.values()) {
    const { unit } = invalidUnit;
    if (unit.kind === 'field') {
      nextDashboardData = restoreField(nextDashboardData, originalDashboardData, unit.field);
      failures.push(
        toFailure(unit.field, formatIssues(invalidUnit), `Change to "${unit.field}" was reverted`)
      );
    }
  }

  return { dashboardData: nextDashboardData, failures, discardedPanelIds };
};
