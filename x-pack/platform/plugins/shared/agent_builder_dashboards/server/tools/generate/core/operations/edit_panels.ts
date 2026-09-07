/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  toEsqlQueryState,
  type CustomContentState,
} from '@kbn/custom-content-common';
import { z } from '@kbn/zod/v4';
import { createPanelFailureResult, type PanelContentAttempt } from '../resolve_panel';
import { indexPanelsById, updatePanelInDashboard } from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { getErrorMessage } from '../utils';
import {
  PANEL_TYPE_DEFINITIONS,
  editPanelItemSchema,
  type EditPanelItem,
  type EditPanelRequestInput,
} from './panels';
import { mergeAndResolveCustomContentEdit } from './panel_creation';
import { defineOperation } from './types';

/** An edit that passed validation, always carrying the existing panel snapshot. */
interface ValidEdit {
  panelInput: EditPanelItem;
  existingPanel: AttachmentPanel;
}

const missingPanelResolverError =
  'Inline panel resolver is required for edit_panels panel requests.';

export const editPanelsOperation = defineOperation({
  schema: z
    .object({
      operation: z.literal('edit_panels'),
      panels: z.array(editPanelItemSchema).min(1).max(100),
    })
    .describe(
      'Edit existing panels in place by panelId. Visualizations: source: "request" regenerates an ES|QL Lens or Vega panel for query or chart-family changes; source: "config", type: "vis" applies presentation-only changes to any Lens API panel (Vega: title, description, hide_title only). Markdown: source: "config", type: "markdown". Custom content: source: "config", type: "custom_content". Non-ES|QL panels cannot take query edits; recreate them as ES|QL panels only with explicit user permission.'
    ),
  handler: async ({ dashboardData, operation, context }) => {
    const { resolvePanelContent } = context;

    const recordFailure = (panelId: string, error: string): void => {
      context.failures.push(
        createPanelFailureResult(DASHBOARD_OPERATION_FAILURE_TYPES.editPanels, panelId, error)
          .failure
      );
    };

    const hasPanelRequestEdits = operation.panels.some(
      (panelInput): panelInput is EditPanelRequestInput => panelInput.source === 'request'
    );
    if (hasPanelRequestEdits && !resolvePanelContent) {
      throw new Error(missingPanelResolverError);
    }

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
        const validation = PANEL_TYPE_DEFINITIONS[panelInput.type].validateConfigEdit?.(
          existingPanel,
          panelInput.config
        ) ?? { ok: true };
        if (!validation.ok) {
          recordFailure(panelInput.panelId, validation.error);
          continue;
        }
        validEdits.push({ panelInput, existingPanel });
        continue;
      }

      // Panel request edits: the resolver enforces the Lens-type check and
      // returns a failure attempt if the existing panel isn't supported.
      validEdits.push({ panelInput, existingPanel });
    }

    // Resolve valid panel request edits in parallel from the entry-time snapshot.
    const validPanelRequestEdits = validEdits.filter(
      (validEdit): validEdit is ValidEdit & { panelInput: EditPanelRequestInput } =>
        validEdit.panelInput.source === 'request'
    );

    const panelContentAttemptByPanelId = new Map<string, PanelContentAttempt>();
    if (validPanelRequestEdits.length > 0) {
      if (!resolvePanelContent) {
        throw new Error(missingPanelResolverError);
      }

      const attempts = await Promise.all(
        validPanelRequestEdits.map(({ panelInput, existingPanel }) =>
          resolvePanelContent({
            type: panelInput.type,
            operationType: operation.operation,
            identifier: panelInput.panelId,
            nlQuery: panelInput.query,
            chartType: panelInput.chartType,
            esql: panelInput.esql,
            existingPanel,
          })
        )
      );
      validPanelRequestEdits.forEach(({ panelInput }, i) => {
        panelContentAttemptByPanelId.set(panelInput.panelId, attempts[i]);
      });
    }

    // Apply valid edits in input order so state changes remain deterministic.
    let nextDashboardData = dashboardData;
    for (const { panelInput, existingPanel } of validEdits) {
      if (panelInput.source === 'config') {
        const definition = PANEL_TYPE_DEFINITIONS[panelInput.type];
        let resolvedConfig: typeof panelInput.config | CustomContentState;
        try {
          if (definition.applyConfigEdit) {
            resolvedConfig = definition.applyConfigEdit(existingPanel, panelInput.config);
          } else if (panelInput.type === CUSTOM_CONTENT_EMBEDDABLE_TYPE && existingPanel) {
            resolvedConfig = context.resolveCustomContentTemplate
              ? await mergeAndResolveCustomContentEdit(
                  panelInput.config,
                  existingPanel.config as CustomContentState,
                  context.resolveCustomContentTemplate
                )
              : {
                  ...(existingPanel.config as CustomContentState),
                  ...(panelInput.config.esqlQuery !== undefined
                    ? { esql_query: toEsqlQueryState(panelInput.config.esqlQuery ?? undefined) }
                    : {}),
                };
          } else {
            resolvedConfig = panelInput.config;
          }
        } catch (err) {
          recordFailure(panelInput.panelId, getErrorMessage(err));
          continue;
        }

        const panelContent = definition.buildPanelContent(resolvedConfig);
        const updateResult = updatePanelInDashboard({
          dashboardData: nextDashboardData,
          panelId: panelInput.panelId,
          transformPanel: (panel) => ({ ...panel, ...panelContent, type: panel.type }),
        });

        if (!updateResult.updated) {
          recordFailure(panelInput.panelId, `Panel "${panelInput.panelId}" not found.`);
          continue;
        }

        nextDashboardData = updateResult.dashboardData;
        continue;
      }

      const attempt = panelContentAttemptByPanelId.get(panelInput.panelId);
      if (!attempt) {
        throw new Error(`Panel edit result for panel "${panelInput.panelId}" is missing.`);
      }

      if (attempt.type === 'failure') {
        context.failures.push(attempt.failure);
        continue;
      }

      const updateResult = updatePanelInDashboard({
        dashboardData: nextDashboardData,
        panelId: panelInput.panelId,
        transformPanel: (panel) => ({ ...panel, ...attempt.panelContent }),
      });

      if (!updateResult.updated) {
        recordFailure(panelInput.panelId, `Panel "${panelInput.panelId}" not found.`);
        continue;
      }

      nextDashboardData = updateResult.dashboardData;
      if (attempt.authoringNote) {
        context.panelAuthoringNotes.push({
          panelId: panelInput.panelId,
          authoringNote: attempt.authoringNote,
        });
      }
    }

    return nextDashboardData;
  },
});
