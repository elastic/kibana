/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { createPanelFailureResult, type PanelContentAttempt } from '../resolve_panel';
import { indexPanelsById, updatePanelInDashboard } from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { panelRequestSchema } from './panel_kinds';
import { MARKDOWN_EMBEDDABLE_TYPE } from './panels/markdown';
import { defineOperation } from './types';

const editPanelRequestInputSchema = panelRequestSchema.omit({ grid: true, index: true }).extend({
  panelId: z.string().describe('Existing Lens panel id to update.'),
  query: z.string().describe('A natural language query describing how to update the panel.'),
});

const editMarkdownConfigSchema = z.object({
  kind: z.literal('panelConfig'),
  type: z.literal('markdown'),
  panelId: z.string().describe('Existing markdown panel id to update.'),
  config: z
    .record(z.string().max(256), z.unknown())
    .describe('New markdown panel config (e.g. { content }). Fully replaces the existing config.'),
});

const editPanelItemSchema = z.discriminatedUnion('kind', [
  editPanelRequestInputSchema,
  editMarkdownConfigSchema,
]);

type EditPanelRequestInput = z.infer<typeof editPanelRequestInputSchema>;
type EditMarkdownConfigInput = z.infer<typeof editMarkdownConfigSchema>;

interface ValidMarkdownEdit {
  kind: 'panelConfig';
  panelInput: EditMarkdownConfigInput;
}

interface ValidPanelRequestEdit {
  kind: 'panelRequest';
  panelInput: EditPanelRequestInput;
  existingPanel: AttachmentPanel;
}

type ValidEdit = ValidMarkdownEdit | ValidPanelRequestEdit;

const missingPanelResolverError =
  'Inline panel resolver is required for edit_panels panel requests.';

export const editPanelsOperation = defineOperation({
  schema: z
    .object({
      operation: z.literal('edit_panels'),
      panels: z.array(editPanelItemSchema).min(1),
    })
    .describe(
      'Edit existing panels in place by panelId. Supports ES|QL-backed Lens visualization panels (kind: "panelRequest") and markdown panels (kind: "panelConfig", type: "markdown"). DSL, form-based, and other non-ES|QL visualization panels are not supported for direct editing and should be recreated as new ES|QL-based Lens panels instead.'
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
      (panelInput): panelInput is EditPanelRequestInput => panelInput.kind === 'panelRequest'
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

      if (panelInput.kind === 'panelConfig') {
        if (existingPanel.type !== MARKDOWN_EMBEDDABLE_TYPE) {
          recordFailure(
            panelInput.panelId,
            `Panel "${panelInput.panelId}" with type "${existingPanel.type}" cannot be edited as markdown. Use kind: "panelRequest" for ES|QL-backed Lens panels.`
          );
          continue;
        }
        validEdits.push({ kind: 'panelConfig', panelInput });
        continue;
      }

      // Panel request edits: the resolver enforces the Lens-type check and
      // returns a failure attempt if the existing panel isn't supported.
      validEdits.push({ kind: 'panelRequest', panelInput, existingPanel });
    }

    // Resolve valid panel request edits in parallel from the entry-time snapshot.
    const validPanelRequestEdits = validEdits.filter(
      (validEdit): validEdit is ValidPanelRequestEdit => validEdit.kind === 'panelRequest'
    );

    const panelContentAttemptByPanelId = new Map<string, PanelContentAttempt>();
    if (validPanelRequestEdits.length > 0) {
      if (!resolvePanelContent) {
        throw new Error(missingPanelResolverError);
      }

      const attempts = await Promise.all(
        validPanelRequestEdits.map(({ panelInput, existingPanel }) =>
          resolvePanelContent({
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
    for (const validEdit of validEdits) {
      if (validEdit.kind === 'panelConfig') {
        const updateResult = updatePanelInDashboard({
          dashboardData: nextDashboardData,
          panelId: validEdit.panelInput.panelId,
          transformPanel: (panel) => ({
            ...panel,
            config: validEdit.panelInput.config,
          }),
        });

        if (!updateResult.updated) {
          recordFailure(
            validEdit.panelInput.panelId,
            `Panel "${validEdit.panelInput.panelId}" not found.`
          );
          continue;
        }

        nextDashboardData = updateResult.dashboardData;
        continue;
      }

      const attempt = panelContentAttemptByPanelId.get(validEdit.panelInput.panelId);
      if (!attempt) {
        throw new Error(
          `Panel edit result for panel "${validEdit.panelInput.panelId}" is missing.`
        );
      }

      if (attempt.type === 'failure') {
        context.failures.push(attempt.failure);
        continue;
      }

      const updateResult = updatePanelInDashboard({
        dashboardData: nextDashboardData,
        panelId: validEdit.panelInput.panelId,
        transformPanel: (panel) => ({
          ...panel,
          ...attempt.panelContent,
        }),
      });

      if (!updateResult.updated) {
        recordFailure(
          validEdit.panelInput.panelId,
          `Panel "${validEdit.panelInput.panelId}" not found.`
        );
        continue;
      }

      nextDashboardData = updateResult.dashboardData;
    }

    return nextDashboardData;
  },
});
