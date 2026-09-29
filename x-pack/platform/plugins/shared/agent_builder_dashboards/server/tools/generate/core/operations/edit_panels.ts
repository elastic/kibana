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
  getConfigPanelEditError,
  type EditPanelItem,
  type EditPanelRequestInput,
  type PanelResolutionRequest,
} from './panels';
import { defineOperation } from './types';

/** An edit that passed validation, always carrying the existing panel snapshot. */
interface ValidEdit {
  panelInput: EditPanelItem;
  existingPanel: AttachmentPanel;
}

/** Maps an edit request input onto the resolution request for its renderer. */
const toPanelResolutionRequest = (
  panelInput: EditPanelRequestInput,
  existingPanel: AttachmentPanel
): PanelResolutionRequest => {
  const base = {
    operationType: 'edit_panels' as const,
    identifier: panelInput.panelId,
    existingPanel,
  };

  if (panelInput.renderer === 'custom_content') {
    const { renderer, query, esql } = panelInput;
    return { ...base, renderer, nlQuery: query, esql };
  }

  const { renderer, query, esql, chartType, preserveESQL } = panelInput;
  return {
    ...base,
    renderer,
    nlQuery: query,
    esql,
    chartType,
    preserveESQL,
    applyChartRules: panelInput.renderer === 'vega' ? undefined : panelInput.applyChartRules,
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
      }

      // Panel request edits: each renderer's resolver checks that the existing
      // panel is one it can edit and returns a failure attempt otherwise.
      validEdits.push({ panelInput, existingPanel });
    }

    // Resolve valid panel request edits in parallel from the entry-time snapshot.
    const panelContentAttemptByPanelId = new Map<string, PanelContentAttempt>();
    const panelRequests = validEdits.flatMap(({ panelInput, existingPanel }) =>
      panelInput.source === 'request'
        ? [
            {
              panelId: panelInput.panelId,
              request: toPanelResolutionRequest(panelInput, existingPanel),
            },
          ]
        : []
    );

    if (panelRequests.length > 0) {
      if (!resolvePanelContent) {
        throw new Error('Inline panel resolver is required for edit_panels panel requests.');
      }

      const attempts = await Promise.all(
        panelRequests.map(({ request }) => resolvePanelContent(request))
      );
      panelRequests.forEach(({ panelId }, i) => {
        panelContentAttemptByPanelId.set(panelId, attempts[i]);
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
