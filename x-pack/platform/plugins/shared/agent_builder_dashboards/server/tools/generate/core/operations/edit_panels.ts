/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import {
  createPanelFailureResult,
  type PanelContent,
  type PanelContentAttempt,
} from '../resolve_panel';
import { indexPanelsById, updatePanelInDashboard } from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import {
  buildConfigPanelContent,
  editPanelItemSchema,
  findConfigPanelType,
  findPanelRenderer,
  getConfigPanelEditError,
  type EditPanelItem,
  type EditPanelRequestInput,
  type PanelResolutionRequest,
} from './panels';
import { defineOperation } from './types';

/** An edit that passed validation; request edits carry their resolution request. */
type ValidEdit =
  | { panelInput: Extract<EditPanelItem, { source: 'config' }> }
  | { panelInput: EditPanelRequestInput; request: PanelResolutionRequest };

const getUneditablePanelError = ({ id, type }: AttachmentPanel): string => {
  const configPanelType = findConfigPanelType(type);
  return configPanelType
    ? `Panel "${id}" is a ${configPanelType.label} panel. Edit it with source: "config", type: "${configPanelType.type}".`
    : `Panel "${id}" with type "${type}" is not supported for inline editing.`;
};

/**
 * Builds the resolution request for a request edit. Lens and Vega edits may
 * omit the renderer, which the existing panel then decides. Custom content
 * edits must name it: without it the edit is parsed as a Lens edit, which lacks
 * custom content's fields. An explicit renderer that disagrees with the panel
 * fails instead of being rewritten. This is the only place an edit's renderer is
 * decided; the resolvers trust the one on the request.
 */
const toPanelResolutionRequest = (
  panelInput: EditPanelRequestInput,
  existingPanel: AttachmentPanel
): { request: PanelResolutionRequest } | { error: string } => {
  const renderer = findPanelRenderer(existingPanel.type);
  if (!renderer) {
    return { error: getUneditablePanelError(existingPanel) };
  }
  if (panelInput.renderer && panelInput.renderer !== renderer) {
    return {
      error: `Panel "${existingPanel.id}" with type "${existingPanel.type}" cannot be edited with renderer: "${panelInput.renderer}". Use renderer: "${renderer}".`,
    };
  }

  const base = {
    operationType: 'edit_panels' as const,
    identifier: panelInput.panelId,
    existingPanel,
  };

  if (panelInput.renderer === 'custom_content') {
    const { query, esql } = panelInput;
    return { request: { ...base, renderer: panelInput.renderer, nlQuery: query, esql } };
  }
  if (renderer === 'custom_content') {
    return {
      error: `Panel "${existingPanel.id}" is a custom content panel. Edit it with source: "request", renderer: "custom_content".`,
    };
  }

  const { query, esql, chartType, preserveESQL } = panelInput;
  return {
    request: {
      ...base,
      renderer,
      nlQuery: query,
      esql,
      chartType,
      preserveESQL,
      applyChartRules: panelInput.renderer === 'vega' ? undefined : panelInput.applyChartRules,
    },
  };
};

export const editPanelsOperation = defineOperation({
  schema: z
    .object({
      operation: z.literal('edit_panels'),
      panels: z.array(editPanelItemSchema).min(1),
    })
    .describe(
      'Edit existing panels in place by panelId. Supports ES|QL-backed Lens and Vega panels and custom content panels (source: "request" with the panel\'s renderer), and by-value panels (source: "config" with the panel\'s type: "markdown", "ml_anomaly_charts", "ml_anomaly_swimlane", or "ml_single_metric_viewer"). DSL, form-based, and other non-ES|QL visualization panels are not supported for direct editing. Report this limitation and only replace them when the user explicitly approves.'
    ),
  handler: async ({ dashboardData, operation, context }) => {
    const { resolvePanelContent } = context;

    const recordFailure = (panelId: string, error: string): void => {
      context.failures.push(
        createPanelFailureResult(DASHBOARD_OPERATION_FAILURE_TYPES.editPanels, panelId, error)
          .failure
      );
    };

    const panelIndex = indexPanelsById(dashboardData.panels);

    const occurrences = new Map<string, number>();
    for (const { panelId } of operation.panels) {
      occurrences.set(panelId, (occurrences.get(panelId) ?? 0) + 1);
    }

    // Validate before resolving panel requests so only valid edits call the LLM.
    const validEdits: ValidEdit[] = [];

    for (const panelInput of operation.panels) {
      if ((occurrences.get(panelInput.panelId) ?? 0) > 1) {
        recordFailure(
          panelInput.panelId,
          `Panel "${panelInput.panelId}" appears multiple times in this edit_panels operation. Edit each panel at most once per operation.`
        );
        continue;
      }

      const existingPanel = panelIndex.get(panelInput.panelId);
      if (!existingPanel) {
        recordFailure(panelInput.panelId, `Panel "${panelInput.panelId}" not found.`);
        continue;
      }

      if (panelInput.source === 'config') {
        const error = getConfigPanelEditError(panelInput.type, existingPanel);
        if (error) {
          recordFailure(panelInput.panelId, error);
          continue;
        }
        validEdits.push({ panelInput });
        continue;
      }

      const result = toPanelResolutionRequest(panelInput, existingPanel);
      if ('error' in result) {
        recordFailure(panelInput.panelId, result.error);
        continue;
      }
      validEdits.push({ panelInput, request: result.request });
    }

    // Resolve valid panel request edits in parallel from the entry-time snapshot.
    const requestEdits = validEdits.filter(
      (edit): edit is Extract<ValidEdit, { request: PanelResolutionRequest }> => 'request' in edit
    );
    const panelContentAttemptByPanelId = new Map<string, PanelContentAttempt>();
    if (requestEdits.length > 0) {
      if (!resolvePanelContent) {
        throw new Error('Inline panel resolver is required for edit_panels panel requests.');
      }
      const attempts = await Promise.all(
        requestEdits.map(({ request }) => resolvePanelContent(request))
      );
      requestEdits.forEach(({ panelInput }, i) => {
        panelContentAttemptByPanelId.set(panelInput.panelId, attempts[i]);
      });
    }

    // Apply valid edits in input order so state changes remain deterministic.
    let nextDashboardData = dashboardData;
    for (const { panelInput } of validEdits) {
      const { panelId } = panelInput;
      let panelContent: PanelContent;
      let authoringNote: string | undefined;

      if (panelInput.source === 'config') {
        panelContent = buildConfigPanelContent(panelInput.type, panelInput.config);
      } else {
        const attempt = panelContentAttemptByPanelId.get(panelId);
        if (!attempt) {
          throw new Error(`Panel edit result for panel "${panelId}" is missing.`);
        }

        if (attempt.type === 'failure') {
          context.failures.push(attempt.failure);
          continue;
        }

        ({ panelContent, authoringNote } = attempt);
      }

      const updateResult = updatePanelInDashboard({
        dashboardData: nextDashboardData,
        panelId,
        transformPanel: (panel) => ({ ...panel, ...panelContent }),
      });

      if (!updateResult.updated) {
        recordFailure(panelId, `Panel "${panelId}" not found.`);
        continue;
      }

      nextDashboardData = updateResult.dashboardData;
      if (authoringNote) {
        context.panelAuthoringNotes.push({ panelId, authoringNote });
      }
    }

    return nextDashboardData;
  },
});
