/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isEqual } from 'lodash';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import {
  appendPanelsToDashboard,
  findSectionIndex,
  getControlId,
  getControlIds,
  getSectionIdByPanelId,
  getSectionsById,
  indexPanelsById,
  removePanelsFromDashboard,
  updatePanelInDashboard,
} from '../dashboard_state';
import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import { appendControls } from '../controls';
import {
  arrangeDashboardLayout,
  getDefaultPanelSize,
  type ArrangeDashboardLayout,
} from '../layout';
import {
  buildConfigPanelContent,
  canEditPanel,
  type ResolvePanelContent,
  type UpsertPanelContent,
} from '../operations/panels';
import {
  getPanelEditError,
  toCreationResolutionRequest,
  toEditResolutionRequest,
} from '../operations/panels/resolution_requests';
import type { ResolveAttachmentPanel, ResolveControlFieldCapabilities } from '../types';
import type { PanelAuthoringNote, PanelContentAttempt } from '../resolve_panel';
import type { DashboardFailure } from '../utils';
import { discardInvalidChanges, type ValidateDashboard } from '../validate_dashboard';
import type { DashboardUpsert, UpsertPanelItem, UpsertSectionItem } from './schema';

type RecordFailure = (identifier: string, error: string) => void;

interface PanelPlan {
  item: UpsertPanelItem;
  existingPanel?: AttachmentPanel;
  resolveContent?: () => PanelContentAttempt | Promise<PanelContentAttempt>;
}

interface PanelResolvers {
  resolvePanelContent: ResolvePanelContent;
  resolveAttachmentPanel: ResolveAttachmentPanel;
}

interface ExecuteDashboardUpsertParams {
  dashboardData?: DashboardAttachmentData;
  upsert: DashboardUpsert;
  logger: Logger;
  resolvePanelContent?: ResolvePanelContent;
  resolveAttachmentPanel?: ResolveAttachmentPanel;
  resolveControlFieldCapabilities?: ResolveControlFieldCapabilities;
  arrangeLayout?: ArrangeDashboardLayout;
  finalizeDashboard?: FinalizeDashboard;
  validateDashboard?: ValidateDashboard;
}

/** Completes the dashboard after the upsert is applied and before it is validated. */
export type FinalizeDashboard = (
  dashboardData: DashboardAttachmentData
) => Promise<DashboardAttachmentData>;

export interface DashboardUpsertResult {
  dashboardData: DashboardAttachmentData;
  /** Ids of the panels, sections and controls the kept changes created. */
  created: string[];
  /** Ids of the existing panels and sections the kept changes updated. */
  updated: string[];
  failures: DashboardFailure[];
  panelAuthoringNotes: PanelAuthoringNote[];
}

const findDuplicates = (ids: string[]): Set<string> =>
  new Set(ids.filter((id, index) => ids.indexOf(id) !== index));

/**
 * Leaves out ids listed both as an update (`panels` or `sections`) and in `remove`, recording one
 * failure for each, so neither the update nor the removal is applied.
 */
const withoutConflictingIds = (
  { sections = [], panels = [], remove = [] }: DashboardUpsert,
  recordFailure: RecordFailure
): { sections: UpsertSectionItem[]; panels: UpsertPanelItem[]; removedIds: Set<string> } => {
  const requestedRemovals = new Set(remove);
  const conflictingIds = new Set(
    [...sections, ...panels].map(({ id }) => id).filter((id) => requestedRemovals.has(id))
  );
  for (const id of conflictingIds) {
    recordFailure(
      id,
      `"${id}" is both updated and removed in this call, so neither change was applied. Do only one.`
    );
  }
  const isKept = ({ id }: { id: string }) => !conflictingIds.has(id);
  return {
    sections: sections.filter(isKept),
    panels: panels.filter(isKept),
    removedIds: new Set([...requestedRemovals].filter((id) => !conflictingIds.has(id))),
  };
};

const applyMetadata = (
  dashboardData: DashboardAttachmentData,
  { title, description, time_range: timeRange }: DashboardUpsert
): DashboardAttachmentData => ({
  ...dashboardData,
  ...(title !== undefined ? { title } : {}),
  ...(description !== undefined ? { description } : {}),
  ...(timeRange !== undefined ? { time_range: timeRange } : {}),
});

const upsertSections = (
  dashboardData: DashboardAttachmentData,
  sections: UpsertSectionItem[],
  recordFailure: RecordFailure
): DashboardAttachmentData => {
  const duplicateIds = findDuplicates(sections.map(({ id }) => id));
  const panelIds = new Set(indexPanelsById(dashboardData.panels).keys());
  let nextDashboardData = dashboardData;

  for (const { id, title, collapsed } of sections) {
    if (duplicateIds.has(id)) {
      recordFailure(id, `Section "${id}" appears more than once. List each section once.`);
      continue;
    }
    if (panelIds.has(id)) {
      recordFailure(id, `"${id}" is a panel id. Use a different id for the section.`);
      continue;
    }

    if (findSectionIndex(nextDashboardData.panels, id) !== -1) {
      nextDashboardData = {
        ...nextDashboardData,
        panels: nextDashboardData.panels.map((widget) =>
          isSection(widget) && widget.id === id
            ? {
                ...widget,
                ...(title !== undefined ? { title } : {}),
                ...(collapsed !== undefined ? { collapsed } : {}),
              }
            : widget
        ),
      };
      continue;
    }

    if (title === undefined) {
      recordFailure(id, `Section "${id}" does not exist. Provide a title to create it.`);
      continue;
    }

    const newSection: DashboardSection = {
      id,
      title,
      collapsed: collapsed ?? false,
      // Positioned by the layout step once every change is applied.
      grid: { y: 0 },
      panels: [],
    };
    nextDashboardData = {
      ...nextDashboardData,
      panels: [...nextDashboardData.panels, newSection],
    };
  }

  return nextDashboardData;
};

/**
 * Plans how a panel item's content resolves: an edit of the existing panel, which the content must
 * match in kind, or a new panel.
 */
const planPanelContent = ({
  id,
  content,
  existingPanel,
  resolvePanelContent,
  resolveAttachmentPanel,
}: PanelResolvers & {
  id: string;
  content: UpsertPanelContent;
  existingPanel?: AttachmentPanel;
}): { resolveContent: NonNullable<PanelPlan['resolveContent']> } | { error: string } => {
  if (existingPanel && !canEditPanel(content, existingPanel)) {
    return { error: getPanelEditError(existingPanel) };
  }

  if (content.source === 'config') {
    const { type, config } = content;
    return {
      resolveContent: () => ({
        type: 'success',
        panelContent: buildConfigPanelContent(type, config),
      }),
    };
  }

  if (content.source === 'attachment') {
    const { attachment_id: attachmentId } = content;
    return { resolveContent: () => resolveAttachmentPanel(attachmentId) };
  }

  const result = existingPanel
    ? toEditResolutionRequest(content, existingPanel)
    : toCreationResolutionRequest(content, id);
  if ('error' in result) {
    return result;
  }
  return { resolveContent: () => resolvePanelContent(result.request) };
};

const planPanels = ({
  dashboardData,
  panels,
  removedIds,
  recordFailure,
  resolvePanelContent,
  resolveAttachmentPanel,
}: PanelResolvers & {
  dashboardData: DashboardAttachmentData;
  panels: UpsertPanelItem[];
  removedIds: ReadonlySet<string>;
  recordFailure: RecordFailure;
}): PanelPlan[] => {
  const duplicateIds = findDuplicates(panels.map(({ id }) => id));
  const panelsById = indexPanelsById(dashboardData.panels);
  const sectionsById = getSectionsById(dashboardData);

  return panels.flatMap((item): PanelPlan[] => {
    const { id, section, content } = item;
    if (duplicateIds.has(id)) {
      recordFailure(id, `Panel "${id}" appears more than once. List each panel once.`);
      return [];
    }
    if (sectionsById.has(id)) {
      recordFailure(id, `"${id}" is a section id. Use a different id for the panel.`);
      return [];
    }
    if (typeof section === 'string' && removedIds.has(section)) {
      recordFailure(
        id,
        `Section "${section}" is removed in this call. Place panel "${id}" in a section that stays, or keep the section.`
      );
      return [];
    }
    if (typeof section === 'string' && !sectionsById.has(section)) {
      recordFailure(
        id,
        `Section "${section}" not found. Create it in \`sections\` or use an existing section id.`
      );
      return [];
    }

    const existingPanel = panelsById.get(id);
    if (!content) {
      if (!existingPanel) {
        recordFailure(id, `Panel "${id}" does not exist. Provide content to create it.`);
        return [];
      }
      return [{ item, existingPanel }];
    }
    const contentPlan = planPanelContent({
      id,
      content,
      existingPanel,
      resolvePanelContent,
      resolveAttachmentPanel,
    });
    if ('error' in contentPlan) {
      recordFailure(id, contentPlan.error);
      return [];
    }
    return [{ item, existingPanel, resolveContent: contentPlan.resolveContent }];
  });
};

/** Applies one planned panel in place, or moves it when it targets another container. */
const applyPanel = ({
  dashboardData,
  plan: { item, existingPanel },
  attempt,
}: {
  dashboardData: DashboardAttachmentData;
  plan: PanelPlan;
  attempt?: Extract<PanelContentAttempt, { type: 'success' }>;
}): DashboardAttachmentData => {
  const { id, section, size } = item;

  if (!existingPanel) {
    if (!attempt) {
      return dashboardData;
    }
    // Positioned by the layout step once every change is applied.
    const grid = { x: 0, y: 0, ...(size ?? getDefaultPanelSize(attempt.panelContent)) };
    return appendPanelsToDashboard({
      dashboardData,
      panelsToAdd: [{ id, ...attempt.panelContent, grid }],
      sectionId: section ?? undefined,
    });
  }

  const transformPanel = (panel: AttachmentPanel): AttachmentPanel => ({
    ...panel,
    ...(attempt ? attempt.panelContent : {}),
    grid: { ...panel.grid, ...size },
  });

  const currentSectionId = getSectionIdByPanelId(dashboardData).get(id);
  if (section === undefined || section === currentSectionId) {
    return updatePanelInDashboard({ dashboardData, panelId: id, transformPanel }).dashboardData;
  }

  const { dashboardData: withoutPanel, removedPanels } = removePanelsFromDashboard({
    dashboardData,
    panelIdsToRemove: [id],
  });
  return appendPanelsToDashboard({
    dashboardData: withoutPanel,
    panelsToAdd: removedPanels.map(transformPanel),
    sectionId: section ?? undefined,
  });
};

const applyRemovals = ({
  dashboardData,
  remove,
  panelItems,
  recordFailure,
}: {
  dashboardData: DashboardAttachmentData;
  remove: ReadonlySet<string>;
  panelItems: UpsertPanelItem[];
  recordFailure: RecordFailure;
}): DashboardAttachmentData => {
  const panelIds = new Set(indexPanelsById(dashboardData.panels).keys());
  const sectionsById = getSectionsById(dashboardData);
  const controlIds = new Set(getControlIds(dashboardData));
  const sectionIdByPanelId = getSectionIdByPanelId(dashboardData);

  const panelIdsToRemove = new Set<string>();
  const sectionIdsToRemove = new Set<string>();
  const controlIdsToRemove = new Set<string>();

  for (const id of remove) {
    if (panelIds.has(id)) {
      panelIdsToRemove.add(id);
    } else if (sectionsById.has(id)) {
      // Panels the call asked to move out of the section are still in it when their move failed.
      const strandedPanelIds = panelItems
        .filter(
          ({ id: panelId, section }) =>
            section !== undefined && sectionIdByPanelId.get(panelId) === id
        )
        .map(({ id: panelId }) => panelId);
      if (strandedPanelIds.length > 0) {
        recordFailure(
          id,
          `Section "${id}" was not removed because ${strandedPanelIds
            .map((panelId) => `"${panelId}"`)
            .join(
              ', '
            )} could not be moved out of it (see their failures), and removing the section would delete them. Fix those panels and remove the section again.`
        );
        continue;
      }
      sectionIdsToRemove.add(id);
    } else if (controlIds.has(id)) {
      controlIdsToRemove.add(id);
    } else {
      recordFailure(id, `Nothing with id "${id}" exists on the dashboard.`);
    }
  }

  const { dashboardData: withoutPanels } = removePanelsFromDashboard({
    dashboardData,
    panelIdsToRemove: [...panelIdsToRemove],
  });

  return {
    ...withoutPanels,
    panels: withoutPanels.panels.filter(
      (widget) => !isSection(widget) || !sectionIdsToRemove.has(widget.id)
    ),
    ...(controlIdsToRemove.size > 0
      ? {
          pinned_panels: (withoutPanels.pinned_panels ?? []).filter(
            (control) => !controlIdsToRemove.has(getControlId(control) ?? '')
          ),
        }
      : {}),
  };
};

/**
 * Splits the changes kept in the final dashboard into created ids (panels, sections and controls
 * that did not exist) and updated ids (requested panels and sections that changed).
 */
const getChangedIds = ({
  originalDashboardData,
  dashboardData,
  panels,
  sections,
}: {
  originalDashboardData: DashboardAttachmentData;
  dashboardData: DashboardAttachmentData;
  panels: UpsertPanelItem[];
  sections: UpsertSectionItem[];
}): { created: string[]; updated: string[] } => {
  const originalPanelsById = indexPanelsById(originalDashboardData.panels);
  const panelsById = indexPanelsById(dashboardData.panels);
  const originalSectionsById = getSectionsById(originalDashboardData);
  const sectionsById = getSectionsById(dashboardData);
  const originalControlIds = new Set(getControlIds(originalDashboardData));
  const originalSectionIdByPanelId = getSectionIdByPanelId(originalDashboardData);
  const sectionIdByPanelId = getSectionIdByPanelId(dashboardData);

  const created = [
    ...[...panelsById.keys()].filter((id) => !originalPanelsById.has(id)),
    ...[...sectionsById.keys()].filter((id) => !originalSectionsById.has(id)),
    ...getControlIds(dashboardData).filter((id) => !originalControlIds.has(id)),
  ];

  const isPanelUpdated = (id: string): boolean => {
    const originalPanel = originalPanelsById.get(id);
    const panel = panelsById.get(id);
    return (
      originalPanel !== undefined &&
      panel !== undefined &&
      (!isEqual(originalPanel, panel) ||
        originalSectionIdByPanelId.get(id) !== sectionIdByPanelId.get(id))
    );
  };
  const isSectionUpdated = (id: string): boolean => {
    const originalSection = originalSectionsById.get(id);
    const section = sectionsById.get(id);
    return (
      originalSection !== undefined &&
      section !== undefined &&
      (originalSection.title !== section.title || originalSection.collapsed !== section.collapsed)
    );
  };

  const updated = [
    ...new Set([
      ...panels.map(({ id }) => id).filter(isPanelUpdated),
      ...sections.map(({ id }) => id).filter(isSectionUpdated),
    ]),
  ];

  return { created, updated };
};

const missingResolver = (message: string) => (): never => {
  throw new Error(message);
};

/**
 * Environment-agnostic dashboard upsert: applies the desired dashboard fields, sections, panels,
 * controls, and removals to a prior dashboard payload (or an empty one), keyed by id. New panels and
 * sections keep the ids the caller chose. Panel content is resolved in parallel through the
 * injected resolvers. The layout step then positions what the call touched, through the injected
 * `arrangeLayout` model call when provided. The host can complete the result with `finalizeDashboard` (e.g. a default
 * time range) before it is validated; changes that make the dashboard invalid are discarded when
 * the host provides `validateDashboard`.
 */
export const executeDashboardUpsert = async ({
  dashboardData,
  upsert,
  logger,
  resolvePanelContent = missingResolver(
    'Inline panel resolver is required for request-source panels.'
  ),
  resolveAttachmentPanel = missingResolver(
    'Attachment panel resolver is required for attachment-source panels.'
  ),
  resolveControlFieldCapabilities,
  arrangeLayout,
  finalizeDashboard,
  validateDashboard,
}: ExecuteDashboardUpsertParams): Promise<DashboardUpsertResult> => {
  const originalDashboardData = structuredClone(
    dashboardData ?? { title: 'User Dashboard', description: undefined, panels: [] }
  );
  const failures: DashboardFailure[] = [];
  const recordFailure: RecordFailure = (identifier, error) => {
    failures.push({ type: DASHBOARD_FAILURE_TYPES.upsertDashboard, identifier, error });
  };

  const { sections, panels, removedIds } = withoutConflictingIds(upsert, recordFailure);

  let nextDashboardData = applyMetadata(originalDashboardData, upsert);
  nextDashboardData = upsertSections(nextDashboardData, sections, recordFailure);

  const plans = planPanels({
    dashboardData: nextDashboardData,
    panels,
    removedIds,
    recordFailure,
    resolvePanelContent,
    resolveAttachmentPanel,
  });
  const attempts = await Promise.all(plans.map((plan) => plan.resolveContent?.()));

  const panelAuthoringNotes: PanelAuthoringNote[] = [];
  const fixedSizePanelIds = new Set<string>();
  plans.forEach((plan, planIndex) => {
    const attempt = attempts[planIndex];
    const { id, size } = plan.item;
    if (attempt?.type === 'failure') {
      failures.push({ ...attempt.failure, identifier: id });
      return;
    }
    if (size) {
      fixedSizePanelIds.add(id);
    }
    nextDashboardData = applyPanel({ dashboardData: nextDashboardData, plan, attempt });
    if (attempt?.authoringNote) {
      panelAuthoringNotes.push({ panelId: id, authoringNote: attempt.authoringNote });
    }
  });

  if (upsert.controls && upsert.controls.length > 0) {
    nextDashboardData = await appendControls({
      dashboardData: nextDashboardData,
      controls: upsert.controls,
      logger,
      failures,
      resolveControlFieldCapabilities,
    });
  }

  if (removedIds.size > 0) {
    nextDashboardData = applyRemovals({
      dashboardData: nextDashboardData,
      remove: removedIds,
      panelItems: panels,
      recordFailure,
    });
  }

  nextDashboardData = await arrangeDashboardLayout({
    originalDashboardData,
    dashboardData: nextDashboardData,
    fixedSizePanelIds,
    instructions: upsert.layout,
    authoringNotesByPanelId: new Map(
      panelAuthoringNotes.map(({ panelId, authoringNote }) => [panelId, authoringNote])
    ),
    arrangeLayout,
    logger,
  });

  if (finalizeDashboard) {
    nextDashboardData = await finalizeDashboard(nextDashboardData);
  }

  const validationResult = validateDashboard
    ? discardInvalidChanges({
        originalDashboardData,
        dashboardData: nextDashboardData,
        validateDashboard,
      })
    : { dashboardData: nextDashboardData, failures: [], discardedPanelIds: new Set<string>() };

  return {
    dashboardData: validationResult.dashboardData,
    ...getChangedIds({
      originalDashboardData,
      dashboardData: validationResult.dashboardData,
      panels,
      sections,
    }),
    failures: [...failures, ...validationResult.failures],
    panelAuthoringNotes: panelAuthoringNotes.filter(
      ({ panelId }) => !validationResult.discardedPanelIds.has(panelId)
    ),
  };
};
