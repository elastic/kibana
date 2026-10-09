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
import type { z } from '@kbn/zod/v4';
import {
  appendPanelsToDashboard,
  findSectionIndex,
  indexPanelsById,
  removePanelsFromDashboard,
  updatePanelInDashboard,
} from '../dashboard_state';
import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import { appendControls } from '../controls';
import {
  buildConfigPanelContent,
  canEditPanel,
  editPanelInputSchema,
  newPanelInputSchema,
  type ResolvePanelContent,
  type UpsertPanelContent,
} from '../operations/panels';
import {
  getRendererlessEditError,
  toCreationResolutionRequest,
  toEditResolutionRequest,
} from '../operations/panels/resolution_requests';
import type { ResolveAttachmentPanel, ResolveControlFieldCapabilities } from '../types';
import type { PanelAuthoringNote, PanelContentAttempt } from '../resolve_panel';
import type { DashboardFailure } from '../utils';
import { discardInvalidChanges, type ValidateDashboard } from '../validate_dashboard';
import { placeNewWidgets } from './placement';
import type { DashboardUpsert, UpsertPanelItem, UpsertSectionItem } from './schema';

/** Request fields that only apply when editing a panel in place. */
const EDIT_ONLY_REQUEST_FIELDS: ReadonlySet<string> = new Set(['preserveESQL', 'applyChartRules']);

/** Grid given to panel inputs while parsing; the item's `grid` sets the real position. */
const PARSE_GRID = { x: 0, y: 0, w: 24, h: 10 };

type RecordFailure = (identifier: string, error: string) => void;

interface PanelPlan {
  item: UpsertPanelItem;
  existingPanel?: AttachmentPanel;
  resolveContent?: () => PanelContentAttempt | Promise<PanelContentAttempt>;
}

interface ExecuteDashboardUpsertParams {
  dashboardData?: DashboardAttachmentData;
  upsert: DashboardUpsert;
  logger: Logger;
  resolvePanelContent?: ResolvePanelContent;
  resolveAttachmentPanel?: ResolveAttachmentPanel;
  resolveControlFieldCapabilities?: ResolveControlFieldCapabilities;
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

const formatIssues = (error: z.ZodError): string =>
  error.issues
    .map(({ path, message }) => (path.length > 0 ? `${path.join('.')}: ${message}` : message))
    .join('; ');

const findDuplicates = (ids: string[]): Set<string> =>
  new Set(ids.filter((id, index) => ids.indexOf(id) !== index));

const getSectionIds = ({ panels }: DashboardAttachmentData): Set<string> =>
  new Set(panels.filter(isSection).map(({ id }) => id));

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
      // Placed below all other widgets once the rest of the upsert is applied.
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
 * Decides how a panel item's content applies: an edit when the content matches the existing
 * panel's kind (and a Lens panel is backed by ES|QL), otherwise new content (a new panel, or a
 * replacement that keeps the id).
 */
const planPanelContent = ({
  id,
  content,
  existingPanel,
  resolvePanelContent,
  resolveAttachmentPanel,
}: {
  id: string;
  content: UpsertPanelContent;
  existingPanel?: AttachmentPanel;
  resolvePanelContent?: ResolvePanelContent;
  resolveAttachmentPanel?: ResolveAttachmentPanel;
}): { resolveContent: NonNullable<PanelPlan['resolveContent']> } | { error: string } => {
  const resolveRequest: ResolvePanelContent = (request) => {
    if (!resolvePanelContent) {
      throw new Error('Inline panel resolver is required for request-source panels.');
    }
    return resolvePanelContent(request);
  };

  const isEdit = existingPanel !== undefined && canEditPanel(content, existingPanel);

  if (existingPanel && !isEdit && content.source === 'request') {
    if (!content.renderer) {
      return { error: getRendererlessEditError(existingPanel) };
    }
    const editOnlyFields = Object.entries(content)
      .filter(([field, value]) => EDIT_ONLY_REQUEST_FIELDS.has(field) && value !== undefined)
      .map(([field]) => `"${field}"`);
    if (editOnlyFields.length > 0) {
      return {
        error: `Panel "${id}" cannot be edited with this content, so the content would replace it, and ${editOnlyFields.join(
          ' and '
        )} only apply to edits. To replace the panel, describe the full new chart without them.`,
      };
    }
  }

  if (existingPanel && isEdit) {
    const parsed = editPanelInputSchema.safeParse({ ...content, panelId: id });
    if (!parsed.success) {
      return { error: `Invalid content for panel "${id}": ${formatIssues(parsed.error)}` };
    }
    const editInput = parsed.data;
    if (editInput.source === 'config') {
      return {
        resolveContent: () => ({
          type: 'success',
          panelContent: buildConfigPanelContent(editInput.type, editInput.config),
        }),
      };
    }
    const result = toEditResolutionRequest(editInput, existingPanel);
    if ('error' in result) {
      return result;
    }
    return { resolveContent: () => resolveRequest(result.request) };
  }

  const parsed = newPanelInputSchema.safeParse({ ...content, grid: PARSE_GRID });
  if (!parsed.success) {
    const replacement = existingPanel
      ? ` The content does not match the existing "${existingPanel.type}" panel, so it replaces the panel and must be complete.`
      : '';
    return {
      error: `Invalid content for panel "${id}":${replacement} ${formatIssues(parsed.error)}`,
    };
  }
  const newInput = parsed.data;
  if (newInput.source === 'config') {
    return {
      resolveContent: () => ({
        type: 'success',
        panelContent: buildConfigPanelContent(newInput.type, newInput.config),
      }),
    };
  }
  if (newInput.source === 'attachment') {
    return {
      resolveContent: () => {
        if (!resolveAttachmentPanel) {
          throw new Error('Attachment panel resolver is required for attachment-source panels.');
        }
        return resolveAttachmentPanel(newInput.attachment_id);
      },
    };
  }
  return {
    resolveContent: () => resolveRequest(toCreationResolutionRequest(newInput, id)),
  };
};

const planPanels = ({
  dashboardData,
  panels,
  removedIds,
  recordFailure,
  resolvePanelContent,
  resolveAttachmentPanel,
}: {
  dashboardData: DashboardAttachmentData;
  panels: UpsertPanelItem[];
  removedIds: ReadonlySet<string>;
  recordFailure: RecordFailure;
  resolvePanelContent?: ResolvePanelContent;
  resolveAttachmentPanel?: ResolveAttachmentPanel;
}): PanelPlan[] => {
  const duplicateIds = findDuplicates(panels.map(({ id }) => id));
  const panelsById = indexPanelsById(dashboardData.panels);
  const sectionIds = getSectionIds(dashboardData);

  return panels.flatMap((item): PanelPlan[] => {
    const { id, section, content } = item;
    if (duplicateIds.has(id)) {
      recordFailure(id, `Panel "${id}" appears more than once. List each panel once.`);
      return [];
    }
    if (sectionIds.has(id)) {
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
    if (typeof section === 'string' && !sectionIds.has(section)) {
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
    if (!existingPanel && !item.grid) {
      recordFailure(id, `Panel "${id}" is new. Provide \`grid\` ({ x, y, w, h }) to create it.`);
      return [];
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

const getPanelSectionId = (
  { panels }: DashboardAttachmentData,
  panelId: string
): string | null | undefined => {
  for (const widget of panels) {
    if (!isSection(widget)) {
      if (widget.id === panelId) {
        return null;
      }
      continue;
    }
    if (widget.panels.some(({ id }) => id === panelId)) {
      return widget.id;
    }
  }
  return undefined;
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
  const { id, section, grid } = item;

  if (!existingPanel) {
    if (!attempt) {
      return dashboardData;
    }
    return appendPanelsToDashboard({
      dashboardData,
      panelsToAdd: [{ id, ...attempt.panelContent, grid: grid ?? PARSE_GRID }],
      sectionId: section ?? undefined,
    });
  }

  const transformPanel = (panel: AttachmentPanel): AttachmentPanel => ({
    ...panel,
    ...(attempt ? attempt.panelContent : {}),
    grid: grid ?? panel.grid,
  });

  const currentSectionId = getPanelSectionId(dashboardData, id);
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

/**
 * Panels that a section to remove still holds although the call asked to move them elsewhere. Their
 * move failed, so removing the section would delete them.
 */
const getStrandedPanelIds = (
  { panels }: DashboardAttachmentData,
  sectionId: string,
  panelItems: UpsertPanelItem[]
): string[] => {
  const section = panels.find((widget) => isSection(widget) && widget.id === sectionId);
  if (!section || !isSection(section)) {
    return [];
  }
  const sectionPanelIds = new Set(section.panels.map(({ id }) => id));
  return panelItems
    .filter(({ id, section: target }) => target !== undefined && sectionPanelIds.has(id))
    .map(({ id }) => id);
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
  const sectionIds = getSectionIds(dashboardData);
  const controlIds = new Set(
    (dashboardData.pinned_panels ?? []).map((control) => (control as { id?: string }).id)
  );

  const panelIdsToRemove = new Set<string>();
  const sectionIdsToRemove = new Set<string>();
  const controlIdsToRemove = new Set<string>();

  for (const id of remove) {
    if (panelIds.has(id)) {
      panelIdsToRemove.add(id);
    } else if (sectionIds.has(id)) {
      const strandedPanelIds = getStrandedPanelIds(dashboardData, id, panelItems);
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
            (control) => !controlIdsToRemove.has((control as { id?: string }).id ?? '')
          ),
        }
      : {}),
  };
};

const getControlIds = ({ pinned_panels: controls = [] }: DashboardAttachmentData): string[] =>
  controls.flatMap((control) => {
    const { id } = control as { id?: string };
    return id ? [id] : [];
  });

const getSectionsById = ({ panels }: DashboardAttachmentData): Map<string, DashboardSection> =>
  new Map(panels.filter(isSection).map((section) => [section.id, section]));

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
        getPanelSectionId(originalDashboardData, id) !== getPanelSectionId(dashboardData, id))
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

/**
 * Environment-agnostic dashboard upsert: applies the desired dashboard fields, sections, panels,
 * controls, and removals to a prior dashboard payload (or an empty one), keyed by id. New panels and
 * sections keep the ids the caller chose. Panel content is resolved in parallel through the
 * injected resolvers. The host can complete the result with `finalizeDashboard` (e.g. a default
 * time range) before it is validated; changes that make the dashboard invalid are discarded when
 * the host provides `validateDashboard`.
 */
export const executeDashboardUpsert = async ({
  dashboardData,
  upsert,
  logger,
  resolvePanelContent,
  resolveAttachmentPanel,
  resolveControlFieldCapabilities,
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
  const movedPanelIds = new Set<string>();
  plans.forEach((plan, planIndex) => {
    const attempt = attempts[planIndex];
    const { id, section, grid } = plan.item;
    if (attempt?.type === 'failure') {
      failures.push({ ...attempt.failure, identifier: id });
      return;
    }
    if (
      plan.existingPanel &&
      grid === undefined &&
      section !== undefined &&
      section !== getPanelSectionId(nextDashboardData, id)
    ) {
      movedPanelIds.add(id);
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

  const originalSectionIds = getSectionIds(originalDashboardData);
  nextDashboardData = placeNewWidgets({
    dashboardData: nextDashboardData,
    movedPanelIds,
    newSectionIds: new Set(
      [...getSectionIds(nextDashboardData)].filter((id) => !originalSectionIds.has(id))
    ),
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
