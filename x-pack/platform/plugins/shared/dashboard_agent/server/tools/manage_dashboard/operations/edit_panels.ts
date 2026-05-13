/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/dashboard-agent-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import { z } from '@kbn/zod/v4';
import {
  createVisualizationFailureResult,
  type VisualizationAttempt,
} from '../inline_visualization';
import { indexPanelsById, updatePanelInDashboard } from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { visualizationPanelBaseInputSchema } from './panel_kinds';
import { defineOperation } from './types';

const editVisualizationPanelInputSchema = visualizationPanelBaseInputSchema
  .omit({ grid: true, index: true })
  .extend({
    kind: z.literal('visualization'),
    panelId: z.string().describe('Existing visualization panel id to update.'),
    query: z
      .string()
      .describe('A natural language query describing how to update the visualization.'),
  });

const editMarkdownPanelInputSchema = z.object({
  kind: z.literal('markdown'),
  panelId: z.string().describe('Existing markdown panel id to update.'),
  markdownContent: z
    .string()
    .describe('New markdown content. Fully replaces the existing markdown content.'),
});

const editPanelItemSchema = z.discriminatedUnion('kind', [
  editVisualizationPanelInputSchema,
  editMarkdownPanelInputSchema,
]);

type EditVisualizationPanelInput = z.infer<typeof editVisualizationPanelInputSchema>;
type EditMarkdownPanelInput = z.infer<typeof editMarkdownPanelInputSchema>;

interface ValidMarkdownEdit {
  kind: 'markdown';
  panelInput: EditMarkdownPanelInput;
}

interface ValidVisualizationEdit {
  kind: 'visualization';
  panelInput: EditVisualizationPanelInput;
  existingPanel: AttachmentPanel;
}

type ValidEdit = ValidMarkdownEdit | ValidVisualizationEdit;

const missingVisualizationResolverError =
  'Inline visualization resolver is required for edit_panels visualizations.';

export const editPanelsOperation = defineOperation({
  schema: z
    .object({
      operation: z.literal('edit_panels'),
      panels: z.array(editPanelItemSchema).min(1),
    })
    .describe(
      'Edit existing panels in place by panelId. Supports ES|QL-backed Lens visualization panels (kind: "visualization") and markdown panels (kind: "markdown"). DSL, form-based, and other non-ES|QL visualization panels are not supported for direct editing and should be recreated as new ES|QL-based Lens panels instead.'
    ),
  handler: async ({ dashboardData, operation, context }) => {
    const { resolveVisualizationConfig } = context;

    const recordFailure = (panelId: string, error: string): void => {
      context.failures.push(
        createVisualizationFailureResult(
          DASHBOARD_OPERATION_FAILURE_TYPES.editPanels,
          panelId,
          error
        ).failure
      );
    };

    const hasVisualizationEdits = operation.panels.some(
      (panelInput): panelInput is EditVisualizationPanelInput => panelInput.kind === 'visualization'
    );
    if (hasVisualizationEdits && !resolveVisualizationConfig) {
      throw new Error(missingVisualizationResolverError);
    }

    const panelIndex = indexPanelsById(dashboardData.panels);

    const occurrences = new Map<string, number>();
    for (const { panelId } of operation.panels) {
      occurrences.set(panelId, (occurrences.get(panelId) ?? 0) + 1);
    }

    // Validate before resolving visualizations so only valid edits call the LLM.
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

      if (panelInput.kind === 'markdown') {
        if (existingPanel.type !== MARKDOWN_EMBEDDABLE_TYPE) {
          recordFailure(
            panelInput.panelId,
            `Panel "${panelInput.panelId}" with type "${existingPanel.type}" cannot be edited as markdown. Use kind: "visualization" for ES|QL-backed Lens panels.`
          );
          continue;
        }
        validEdits.push({ kind: 'markdown', panelInput });
        continue;
      }

      // Visualization edits: the resolver enforces the Lens-type check and
      // returns a failure attempt if the existing panel isn't supported.
      validEdits.push({ kind: 'visualization', panelInput, existingPanel });
    }

    // Resolve valid visualization edits in parallel from the entry-time snapshot.
    const validVisualizationEdits = validEdits.filter(
      (validEdit): validEdit is ValidVisualizationEdit => validEdit.kind === 'visualization'
    );

    const visualizationAttemptByPanelId = new Map<string, VisualizationAttempt>();
    if (validVisualizationEdits.length > 0) {
      if (!resolveVisualizationConfig) {
        throw new Error(missingVisualizationResolverError);
      }

      const attempts = await Promise.all(
        validVisualizationEdits.map(({ panelInput, existingPanel }) =>
          resolveVisualizationConfig({
            operationType: operation.operation,
            identifier: panelInput.panelId,
            nlQuery: panelInput.query,
            chartType: panelInput.chartType,
            esql: panelInput.esql,
            existingPanel,
          })
        )
      );
      validVisualizationEdits.forEach(({ panelInput }, i) => {
        visualizationAttemptByPanelId.set(panelInput.panelId, attempts[i]);
      });
    }

    // Apply valid edits in input order so state changes remain deterministic.
    let nextDashboardData = dashboardData;
    for (const validEdit of validEdits) {
      if (validEdit.kind === 'markdown') {
        const updateResult = updatePanelInDashboard({
          dashboardData: nextDashboardData,
          panelId: validEdit.panelInput.panelId,
          transformPanel: (panel) => ({
            ...panel,
            config: { ...panel.config, content: validEdit.panelInput.markdownContent },
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

      const attempt = visualizationAttemptByPanelId.get(validEdit.panelInput.panelId);
      if (!attempt) {
        throw new Error(
          `Visualization edit result for panel "${validEdit.panelInput.panelId}" is missing.`
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
          ...attempt.visContent,
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
