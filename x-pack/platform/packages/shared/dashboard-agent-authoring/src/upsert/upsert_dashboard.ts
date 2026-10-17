/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isEqual, omit } from 'lodash';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
  type DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import {
  appendPanelsToDashboard,
  findSectionIndex,
  getContainerWidgets,
  getControlId,
  getControlIds,
  getPlaceholderGrid,
  getSectionIdByPanelId,
  getSectionsById,
  getWidgetsBottomY,
  indexPanelsById,
  removePanelsFromDashboard,
  updatePanelInDashboard,
} from '../dashboard_state';
import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import { appendControls } from '../controls';
import {
  buildConfigPanelContent,
  type ResolvePanelContent,
  type UpsertPanelContent,
} from '../panels';
import {
  getPanelEditError,
  toCreationResolutionRequest,
  toEditResolutionRequest,
} from '../panels/resolution_requests';
import type { ResolveAttachmentPanel, ResolveControlFieldCapabilities } from '../types';
import type { PanelAuthoringNote, PanelContentAttempt } from '../resolve_panel';
import type { DashboardFailure } from '../utils';
import { discardInvalidChanges, type DashboardValidator } from '../validate_dashboard';
import type { DashboardUpsert, UpsertPanelItem, UpsertSectionItem } from './schema';

type RecordFailure = (identifier: string, error: string) => void;

interface PanelPlan {
  item: UpsertPanelItem;
  existingPanel?: AttachmentPanel;
  attempt?: Promise<PanelContentAttempt>;
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
  validator?: DashboardValidator;
}

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

interface ValidItems {
  sections: UpsertSectionItem[];
  panels: UpsertPanelItem[];
  removedIds: Set<string>;
  /** Ids of every panel the call asked to move, valid or not, in request order. */
  movedPanelIds: Set<string>;
}

/**
 * Checks every requested id against the dashboard and the rest of the call, recording one failure
 * for each item that cannot be applied and leaving it out. An id that is both updated and removed
 * is left out of both.
 */
const rejectInvalidItems = (
  dashboardData: DashboardAttachmentData,
  { sections = [], panels = [], remove = [] }: DashboardUpsert,
  recordFailure: RecordFailure
): ValidItems => {
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
  const isNotConflicting = ({ id }: { id: string }) => !conflictingIds.has(id);
  const requestedSections = sections.filter(isNotConflicting);
  const requestedPanels = panels.filter(isNotConflicting);
  const removedIds = new Set([...requestedRemovals].filter((id) => !conflictingIds.has(id)));

  const panelsById = indexPanelsById(dashboardData.panels);
  const existingSectionIds = new Set(getSectionsById(dashboardData).keys());
  const controlIds = new Set(getControlIds(dashboardData));
  const sectionIdByPanelId = getSectionIdByPanelId(dashboardData);

  const duplicateSectionIds = findDuplicates(requestedSections.map(({ id }) => id));
  const validSections = requestedSections.filter(({ id, title }) => {
    if (duplicateSectionIds.has(id)) {
      recordFailure(id, `Section "${id}" appears more than once. List each section once.`);
      return false;
    }
    if (panelsById.has(id)) {
      recordFailure(id, `"${id}" is a panel id. Use a different id for the section.`);
      return false;
    }
    if (controlIds.has(id)) {
      recordFailure(id, `"${id}" is a control id. Use a different id for the section.`);
      return false;
    }
    if (!existingSectionIds.has(id) && title === undefined) {
      recordFailure(id, `Section "${id}" does not exist. Provide a title to create it.`);
      return false;
    }
    return true;
  });
  const sectionIds = new Set([...existingSectionIds, ...validSections.map(({ id }) => id)]);

  const duplicatePanelIds = findDuplicates(requestedPanels.map(({ id }) => id));
  const validPanels = requestedPanels.filter(({ id, section, content }) => {
    if (duplicatePanelIds.has(id)) {
      recordFailure(id, `Panel "${id}" appears more than once. List each panel once.`);
      return false;
    }
    if (sectionIds.has(id)) {
      recordFailure(id, `"${id}" is a section id. Use a different id for the panel.`);
      return false;
    }
    if (controlIds.has(id)) {
      recordFailure(id, `"${id}" is a control id. Use a different id for the panel.`);
      return false;
    }
    const currentSectionId = sectionIdByPanelId.get(id);
    if (section === undefined && currentSectionId && removedIds.has(currentSectionId)) {
      recordFailure(
        id,
        `Panel "${id}" is in section "${currentSectionId}", which is removed in this call, so the panel is removed with it. To keep the panel, move it out with \`section\`.`
      );
      return false;
    }
    if (typeof section === 'string' && removedIds.has(section)) {
      recordFailure(
        id,
        `Section "${section}" is removed in this call. Place panel "${id}" in a section that stays, or keep the section.`
      );
      return false;
    }
    if (typeof section === 'string' && !sectionIds.has(section)) {
      recordFailure(
        id,
        `Section "${section}" not found. Create it in \`sections\` or use an existing section id.`
      );
      return false;
    }
    if (!content && !panelsById.has(id)) {
      recordFailure(id, `Panel "${id}" does not exist. Provide content to create it.`);
      return false;
    }
    return true;
  });

  return {
    sections: validSections,
    panels: validPanels,
    removedIds,
    movedPanelIds: new Set(
      requestedPanels.filter(({ section }) => section !== undefined).map(({ id }) => id)
    ),
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
  sections: UpsertSectionItem[]
): DashboardAttachmentData =>
  sections.reduce((nextDashboardData, { id, title, collapsed }) => {
    if (findSectionIndex(nextDashboardData.panels, id) !== -1) {
      return {
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
    }
    // rejectInvalidItems leaves out new sections without a title.
    if (title === undefined) {
      return nextDashboardData;
    }

    const newSection: DashboardSection = {
      id,
      title,
      collapsed: collapsed ?? false,
      grid: { y: getWidgetsBottomY(nextDashboardData.panels) },
      panels: [],
    };
    return { ...nextDashboardData, panels: [...nextDashboardData.panels, newSection] };
  }, dashboardData);

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
}): { attempt: Promise<PanelContentAttempt> } | { error: string } => {
  const editError = existingPanel && getPanelEditError(content, existingPanel);
  if (editError) {
    return { error: editError };
  }

  if (content.source === 'config') {
    const { type, config } = content;
    return {
      attempt: Promise.resolve({
        type: 'success',
        panelContent: buildConfigPanelContent(type, config),
      }),
    };
  }

  if (content.source === 'attachment') {
    const { attachment_id: attachmentId } = content;
    return { attempt: Promise.resolve(resolveAttachmentPanel(attachmentId)) };
  }

  const result = existingPanel
    ? toEditResolutionRequest(content, existingPanel)
    : toCreationResolutionRequest(content, id);
  if ('error' in result) {
    return result;
  }
  return { attempt: Promise.resolve(resolvePanelContent(result.request)) };
};

/** Starts resolving the content of every panel, so they resolve in parallel. */
const planPanels = ({
  dashboardData,
  panels,
  recordFailure,
  resolvePanelContent,
  resolveAttachmentPanel,
}: PanelResolvers & {
  dashboardData: DashboardAttachmentData;
  panels: UpsertPanelItem[];
  recordFailure: RecordFailure;
}): PanelPlan[] => {
  const panelsById = indexPanelsById(dashboardData.panels);

  return panels.flatMap((item): PanelPlan[] => {
    const { id, content } = item;
    const existingPanel = panelsById.get(id);
    if (!content) {
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
    return [{ item, existingPanel, attempt: contentPlan.attempt }];
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
  const { id, section } = item;
  const sectionId = section ?? undefined;

  if (!existingPanel && attempt) {
    const grid = getPlaceholderGrid(getContainerWidgets(dashboardData, sectionId));
    return appendPanelsToDashboard({
      dashboardData,
      panelsToAdd: [{ id, ...attempt.panelContent, grid }],
      sectionId,
    });
  }

  const transformPanel = (panel: AttachmentPanel): AttachmentPanel => ({
    ...panel,
    ...(attempt ? attempt.panelContent : {}),
  });

  const currentSectionId = getSectionIdByPanelId(dashboardData).get(id);
  if (section === undefined || section === currentSectionId) {
    return updatePanelInDashboard({ dashboardData, panelId: id, transformPanel }).dashboardData;
  }

  const { dashboardData: withoutPanel, removedPanels } = removePanelsFromDashboard({
    dashboardData,
    panelIdsToRemove: [id],
  });
  const targetWidgets = getContainerWidgets(withoutPanel, sectionId);
  return appendPanelsToDashboard({
    dashboardData: withoutPanel,
    panelsToAdd: removedPanels.map((panel) => ({
      ...transformPanel(panel),
      grid: getPlaceholderGrid(targetWidgets, panel.grid),
    })),
    sectionId,
  });
};

const applyRemovals = ({
  dashboardData,
  remove,
  movedPanelIds,
  recordFailure,
}: {
  dashboardData: DashboardAttachmentData;
  remove: ReadonlySet<string>;
  movedPanelIds: ReadonlySet<string>;
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
      const strandedPanelIds = [...movedPanelIds].filter(
        (panelId) => sectionIdByPanelId.get(panelId) === id
      );
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
      !isEqual(omit(originalSection, 'panels', 'grid'), omit(section, 'panels', 'grid'))
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
 * injected resolvers. New and moved panels get placeholder grids below their container, for the
 * layout step to place. Changes that make the dashboard invalid are discarded when the host
 * provides a `validator`.
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
  validator,
}: ExecuteDashboardUpsertParams): Promise<DashboardUpsertResult> => {
  const originalDashboardData = structuredClone(
    dashboardData ?? { title: 'User Dashboard', description: undefined, panels: [] }
  );
  const failures: DashboardFailure[] = [];
  const recordFailure: RecordFailure = (identifier, error) => {
    failures.push({ type: DASHBOARD_FAILURE_TYPES.upsertDashboard, identifier, error });
  };

  const { sections, panels, removedIds, movedPanelIds } = rejectInvalidItems(
    originalDashboardData,
    upsert,
    recordFailure
  );

  let nextDashboardData = applyMetadata(originalDashboardData, upsert);
  nextDashboardData = upsertSections(nextDashboardData, sections);

  const plans = planPanels({
    dashboardData: nextDashboardData,
    panels,
    recordFailure,
    resolvePanelContent,
    resolveAttachmentPanel,
  });
  const attempts = await Promise.all(plans.map(({ attempt }) => attempt));

  const panelAuthoringNotes: PanelAuthoringNote[] = [];
  plans.forEach((plan, planIndex) => {
    const attempt = attempts[planIndex];
    const { id } = plan.item;
    if (attempt?.type === 'failure') {
      failures.push({ ...attempt.failure, identifier: id });
      return;
    }
    nextDashboardData = applyPanel({ dashboardData: nextDashboardData, plan, attempt });
    if (attempt?.authoringNote) {
      panelAuthoringNotes.push({ panelId: id, authoringNote: attempt.authoringNote });
    }
  });

  nextDashboardData = await appendControls({
    dashboardData: nextDashboardData,
    controls: upsert.controls ?? [],
    logger,
    failures,
    resolveControlFieldCapabilities,
  });

  nextDashboardData = applyRemovals({
    dashboardData: nextDashboardData,
    remove: removedIds,
    movedPanelIds,
    recordFailure,
  });

  const validationResult = validator
    ? discardInvalidChanges({
        originalDashboardData,
        dashboardData: nextDashboardData,
        validator,
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
