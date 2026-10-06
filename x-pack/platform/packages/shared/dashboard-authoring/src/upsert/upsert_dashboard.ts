/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
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
  getWidgetsBottomY,
  indexPanelsById,
  removePanelsFromDashboard,
  updatePanelInDashboard,
} from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import {
  arrangeDashboardLayout,
  getDefaultPanelSize,
  type ArrangeDashboardLayout,
} from '../layout';
import { appendControls } from '../controls';
import {
  buildConfigPanelContent,
  editPanelInputSchema,
  getEditableEmbeddableTypes,
  newPanelInputSchema,
  type ResolvePanelContent,
  type UpsertPanelContent,
} from '../panels';
import {
  toCreationResolutionRequest,
  toEditResolutionRequest,
} from '../panels/resolution_requests';
import type { ResolveAttachmentPanel, ResolveControlFieldCapabilities } from '../types';
import type { PanelAuthoringNote, PanelContentAttempt } from '../resolve_panel';
import type { OperationFailure } from '../utils';
import { discardInvalidChanges, type ValidateDashboard } from '../validate_dashboard';
import type { DashboardUpsert, UpsertPanelItem, UpsertSectionItem } from './schema';

/** Grid given to panel inputs while parsing; the layout step decides the real position. */
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
  validateDashboard?: ValidateDashboard;
  arrangeLayout?: ArrangeDashboardLayout;
}

const formatIssues = (error: z.ZodError): string =>
  error.issues
    .map(({ path, message }) => (path.length > 0 ? `${path.join('.')}: ${message}` : message))
    .join('; ');

const findDuplicates = (ids: string[]): Set<string> =>
  new Set(ids.filter((id, index) => ids.indexOf(id) !== index));

const getSectionIds = ({ panels }: DashboardAttachmentData): Set<string> =>
  new Set(panels.filter(isSection).map(({ id }) => id));

const applyMetadata = (
  dashboardData: DashboardAttachmentData,
  set: DashboardUpsert['set']
): DashboardAttachmentData => ({
  ...dashboardData,
  ...(set?.title !== undefined ? { title: set.title } : {}),
  ...(set?.description !== undefined ? { description: set.description } : {}),
  ...(set?.time_range !== undefined ? { time_range: set.time_range } : {}),
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
      grid: { y: getWidgetsBottomY(nextDashboardData.panels) },
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
 * panel's kind, otherwise new content (a new panel, or a replacement that keeps the id).
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

  const isEdit =
    existingPanel !== undefined && getEditableEmbeddableTypes(content).includes(existingPanel.type);

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
    return { error: `Invalid content for panel "${id}": ${formatIssues(parsed.error)}` };
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
  recordFailure,
  resolvePanelContent,
  resolveAttachmentPanel,
}: {
  dashboardData: DashboardAttachmentData;
  panels: UpsertPanelItem[];
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

const isReplacement = (
  existingPanel: AttachmentPanel,
  attempt?: Extract<PanelContentAttempt, { type: 'success' }>
): boolean => attempt !== undefined && attempt.panelContent.type !== existingPanel.type;

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
    const panel: AttachmentPanel = { id, ...attempt.panelContent, grid: PARSE_GRID };
    const size = grid ?? getDefaultPanelSize(panel);
    return appendPanelsToDashboard({
      dashboardData,
      panelsToAdd: [{ ...panel, grid: { x: 0, y: 0, ...size } }],
      sectionId: section ?? undefined,
    });
  }

  const transformPanel = (panel: AttachmentPanel): AttachmentPanel => {
    const nextPanel = { ...panel, ...(attempt ? attempt.panelContent : {}) };
    const size =
      grid ?? (isReplacement(existingPanel, attempt) ? getDefaultPanelSize(nextPanel) : undefined);
    return size ? { ...nextPanel, grid: { ...panel.grid, ...size } } : nextPanel;
  };

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

const applyRemovals = ({
  dashboardData,
  remove,
  upsertedIds,
  recordFailure,
}: {
  dashboardData: DashboardAttachmentData;
  remove: string[];
  upsertedIds: ReadonlySet<string>;
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

  for (const id of new Set(remove)) {
    if (upsertedIds.has(id)) {
      recordFailure(id, `"${id}" is both updated and removed in this call. Do only one.`);
    } else if (panelIds.has(id)) {
      panelIdsToRemove.add(id);
    } else if (sectionIds.has(id)) {
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

/**
 * Environment-agnostic dashboard upsert: applies the desired metadata, sections, panels, controls,
 * and removals to a prior dashboard payload (or an empty one), keyed by id. New panels and
 * sections keep the ids the caller chose. Panel content is resolved in parallel through the
 * injected resolvers; changes that make the dashboard invalid are discarded when the host provides
 * `validateDashboard`. Positions are decided last by the layout step, which uses the injected
 * `arrangeLayout` call when provided.
 */
export const executeDashboardUpsert = async ({
  dashboardData,
  upsert,
  logger,
  resolvePanelContent,
  resolveAttachmentPanel,
  resolveControlFieldCapabilities,
  validateDashboard,
  arrangeLayout,
}: ExecuteDashboardUpsertParams): Promise<{
  dashboardData: DashboardAttachmentData;
  failures: OperationFailure[];
  panelAuthoringNotes: PanelAuthoringNote[];
}> => {
  const originalDashboardData = structuredClone(
    dashboardData ?? { title: 'User Dashboard', description: undefined, panels: [] }
  );
  const failures: OperationFailure[] = [];
  const recordFailure: RecordFailure = (identifier, error) => {
    failures.push({ type: DASHBOARD_OPERATION_FAILURE_TYPES.upsertDashboard, identifier, error });
  };

  let nextDashboardData = applyMetadata(originalDashboardData, upsert.set);
  nextDashboardData = upsertSections(nextDashboardData, upsert.sections ?? [], recordFailure);

  const plans = planPanels({
    dashboardData: nextDashboardData,
    panels: upsert.panels ?? [],
    recordFailure,
    resolvePanelContent,
    resolveAttachmentPanel,
  });
  const attempts = await Promise.all(plans.map((plan) => plan.resolveContent?.()));

  const panelAuthoringNotes: PanelAuthoringNote[] = [];
  const fixedSizePanelIds = new Set<string>();
  const replacedPanelIds = new Set<string>();
  plans.forEach((plan, planIndex) => {
    const attempt = attempts[planIndex];
    if (attempt?.type === 'failure') {
      failures.push(attempt.failure);
      return;
    }
    nextDashboardData = applyPanel({ dashboardData: nextDashboardData, plan, attempt });
    const { id, grid } = plan.item;
    if (grid) {
      fixedSizePanelIds.add(id);
    }
    if (plan.existingPanel && isReplacement(plan.existingPanel, attempt)) {
      replacedPanelIds.add(id);
    }
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

  if (upsert.remove && upsert.remove.length > 0) {
    nextDashboardData = applyRemovals({
      dashboardData: nextDashboardData,
      remove: upsert.remove,
      upsertedIds: new Set([
        ...(upsert.panels ?? []).map(({ id }) => id),
        ...(upsert.sections ?? []).map(({ id }) => id),
      ]),
      recordFailure,
    });
  }

  const validationResult = validateDashboard
    ? discardInvalidChanges({
        originalDashboardData,
        dashboardData: nextDashboardData,
        validateDashboard,
      })
    : { dashboardData: nextDashboardData, failures: [], discardedPanelIds: new Set<string>() };

  const keptAuthoringNotes = panelAuthoringNotes.filter(
    ({ panelId }) => !validationResult.discardedPanelIds.has(panelId)
  );

  const arrangedDashboardData = await arrangeDashboardLayout({
    originalDashboardData,
    dashboardData: validationResult.dashboardData,
    fixedSizePanelIds,
    replacedPanelIds,
    instructions: upsert.layout,
    authoringNotesByPanelId: new Map(
      keptAuthoringNotes.map(({ panelId, authoringNote }) => [panelId, authoringNote])
    ),
    arrangeLayout,
    logger,
  });

  return {
    dashboardData: arrangedDashboardData,
    failures: [...failures, ...validationResult.failures],
    panelAuthoringNotes: keptAuthoringNotes,
  };
};
