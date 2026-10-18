/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AttachmentPanel, DashboardSection } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { createPanelInputMaterializer } from './panel_creation';
import { defineOperation } from './types';
import { addSectionPanelItemSchema } from './panels';
import { findSectionIndex, getPlaceholderGrid, getWidgetsBottomY } from '../dashboard_state';

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
    panels: z
      .array(addSectionPanelItemSchema)
      .min(1)
      .optional()
      .describe(
        "Creates new panels inside the section. To group existing panels, omit this field and move their original panelIds with move_panels using this section's key."
      ),
  }),
  handler: ({ dashboardData, operation, operationIndex, context }) => {
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
      grid: { y: getWidgetsBottomY(dashboardData.panels) },
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

      const materialized = operation.panels.map(materializePanelInput);

      const sectionPanels: AttachmentPanel[] = [];

      for (const panel of materialized) {
        if (panel === undefined) continue;

        const panelId = uuidv4();
        sectionPanels.push({
          id: panelId,
          ...panel.panelContent,
          grid: getPlaceholderGrid(sectionPanels),
        });
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
