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
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { z } from '@kbn/zod/v4';
import {
  isEsqlLensConfig,
  isLensApiConfig,
  pickPanelKeys,
  unsupportedLensDataEditMessage,
} from '../lens_config';
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

const isUnsupportedLensDataOrChartFamilyEdit = (
  existingPanel: AttachmentPanel,
  panelInput: EditPanelRequestInput
): boolean => {
  if (existingPanel.type !== LENS_EMBEDDABLE_TYPE) {
    return false;
  }

  const regenerate = panelInput.regenerate_query === true;
  const existingType = isLensApiConfig(existingPanel.config)
    ? existingPanel.config.type
    : undefined;
  const isChartFamilyEdit =
    panelInput.chartType !== undefined && panelInput.chartType !== existingType;
  if (!regenerate && !isChartFamilyEdit) {
    return false;
  }

  const isDslOrRaw = !isEsqlLensConfig(existingPanel.config);
  return isDslOrRaw;
};

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
      panels: z.array(editPanelItemSchema).min(1),
    })
    .describe(
      'Edit existing panels in place by panelId. Supports Lens and Vega visualization panels (source: "request", which keep their existing renderer), markdown panels (source: "config", type: "markdown"), and custom content panels (source: "config", type: "custom_content").'
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
          existingPanel
        ) ?? { ok: true };
        if (!validation.ok) {
          recordFailure(panelInput.panelId, validation.error);
          continue;
        }
        validEdits.push({ panelInput, existingPanel });
        continue;
      }

      if (isUnsupportedLensDataOrChartFamilyEdit(existingPanel, panelInput)) {
        recordFailure(panelInput.panelId, unsupportedLensDataEditMessage(panelInput.panelId));
        continue;
      }

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
        validPanelRequestEdits.map(({ panelInput, existingPanel }) => {
          const regenerate = panelInput.regenerate_query === true;
          const styleRequest =
            panelInput.style_request ??
            (!regenerate && panelInput.query ? panelInput.query : undefined);
          const nlQuery = panelInput.query ?? 'Update panel';

          return resolvePanelContent({
            type: panelInput.type,
            operationType: operation.operation,
            identifier: panelInput.panelId,
            nlQuery,
            chartType: panelInput.chartType,
            esql: panelInput.esql,
            existingPanel,
            title: panelInput.title,
            intent: panelInput.intent,
            styleOverrides: panelInput.style_overrides,
            styleRequest,
            regenerateQuery: regenerate,
            hideTitle: panelInput.hide_title,
          });
        })
      );
      validPanelRequestEdits.forEach(({ panelInput }, i) => {
        panelContentAttemptByPanelId.set(panelInput.panelId, attempts[i]);
      });
    }

    // Apply valid edits in input order so state changes remain deterministic.
    let nextDashboardData = dashboardData;
    for (const { panelInput, existingPanel } of validEdits) {
      if (panelInput.source === 'config') {
        let resolvedConfig: typeof panelInput.config | CustomContentState;
        try {
          resolvedConfig =
            panelInput.type === CUSTOM_CONTENT_EMBEDDABLE_TYPE && existingPanel
              ? context.resolveCustomContentTemplate
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
                  }
              : panelInput.config;
        } catch (err) {
          recordFailure(panelInput.panelId, getErrorMessage(err));
          continue;
        }

        const panelContent =
          PANEL_TYPE_DEFINITIONS[panelInput.type].buildPanelContent(resolvedConfig);
        const updateResult = updatePanelInDashboard({
          dashboardData: nextDashboardData,
          panelId: panelInput.panelId,
          transformPanel: (panel) => ({ ...panel, ...panelContent }),
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
        transformPanel: (panel) => ({
          ...panel,
          ...attempt.panelContent,
          config: {
            ...pickPanelKeys(panel.config),
            ...attempt.panelContent.config,
          },
        }),
      });

      if (!updateResult.updated) {
        recordFailure(panelInput.panelId, `Panel "${panelInput.panelId}" not found.`);
        continue;
      }

      nextDashboardData = updateResult.dashboardData;
      if (panelInput.regenerate_query === true) {
        context.touchedRequestPanelData = true;
      }
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
