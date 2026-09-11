/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { sectionGridSchema } from '@kbn/agent-builder-dashboards-common';
import type { AttachmentPanel, DashboardSection } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { createPanelInputMaterializer, applyCustomContentTemplates } from './panel_creation';
import { defineOperation } from './types';
import { addSectionPanelItemSchema } from './panels';
import { findSectionIndex } from '../dashboard_state';

export const addSectionOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_section'),
    key: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe(
        'Optional key for referencing this new section in later operations in the same call, using sectionId (or remove_section.id). Must be unique within the call and must not match an existing section id. Not saved; future calls use the generated section id from the result.'
      ),
    title: z.string().max(256).describe('Section title.'),
    grid: sectionGridSchema,
    panels: z
      .array(addSectionPanelItemSchema)
      .min(1)
      .optional()
      .describe(
        'Optional new panels (source: "config" or source: "request") to create inside the section. To group existing panels, omit this field and move their IDs with update_panel_layouts. Panel grids are section-relative.'
      ),
  }),
  handler: async ({ dashboardData, operation, operationIndex, context }) => {
    const { key } = operation;
    if (key !== undefined) {
      if (context.sectionIdsByKey.has(key)) {
        throw new Error(`Section key "${key}" is already used in this call.`);
      }
      if (findSectionIndex(dashboardData.panels, key) !== -1) {
        throw new Error(`Section key "${key}" conflicts with an existing section id.`);
      }
    }

    let nextSection: DashboardSection = {
      id: uuidv4(),
      title: operation.title,
      collapsed: false,
      grid: operation.grid,
      panels: [],
    };

    if (operation.panels) {
      const materializePanelInput = createPanelInputMaterializer({
        resolvedPanelCreationRequests: context.resolvedPanelCreationRequests,
        operationIndex,
        operationType: operation.operation,
        failures: context.failures,
        resolveAttachmentPanel: context.resolveAttachmentPanel,
      });

      const materialized = operation.panels.map((item, i) => ({
        item,
        panel: materializePanelInput(item, i),
      }));

      if (context.resolveCustomContentTemplate) {
        await applyCustomContentTemplates(
          materialized,
          context.resolveCustomContentTemplate,
          context.failures
        );
      }

      const sectionPanels: AttachmentPanel[] = [];

      for (const { item, panel } of materialized) {
        if (panel === undefined) continue;

        const panelId = uuidv4();
        sectionPanels.push({ id: panelId, ...panel.panelContent, grid: item.grid });
        if (panel.authoringNote) {
          context.panelAuthoringNotes.push({
            panelId,
            authoringNote: panel.authoringNote,
          });
        }
      }

      nextSection = {
        ...nextSection,
        panels: sectionPanels,
      };
    }

    if (key !== undefined) {
      context.sectionIdsByKey.set(key, nextSection.id);
    }

    return {
      ...dashboardData,
      panels: [...dashboardData.panels, nextSection],
    };
  },
});
