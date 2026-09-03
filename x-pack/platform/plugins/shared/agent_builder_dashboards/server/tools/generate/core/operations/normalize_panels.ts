/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  normalizeLensPanelConfig,
  type HouseStylePreserve,
} from '@kbn/agent-builder-visualizations-server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { z } from '@kbn/zod/v4';
import { indexPanelsById, updatePanelInDashboard } from '../dashboard_state';
import { defineOperation } from './types';

const HOUSE_STYLE_PRESERVE = [
  'panel_title',
  'axis_titles',
  'legend_position',
  'legend_visibility',
  'area_fill',
  'series_colors',
  'metric_color',
  'table_cell_colors',
] as const satisfies readonly HouseStylePreserve[];

export const normalizePanelsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('normalize_panels'),
    panelIds: z.array(z.string().max(256)).optional(),
    rules: z.enum(['defects', 'all']).optional(),
    colors: z.enum(['keep', 'reset']).optional(),
    preserve: z.array(z.enum(HOUSE_STYLE_PRESERVE)).optional(),
  }),
  handler: ({ dashboardData, operation, context }) => {
    const panelIndex = indexPanelsById(dashboardData.panels);
    const targetIds = operation.panelIds ?? [...panelIndex.keys()];

    let nextDashboardData = dashboardData;

    for (const panelId of targetIds) {
      const panel = panelIndex.get(panelId);
      if (!panel) {
        context.normalizeSkipped.push({ id: panelId, reason: 'not_found' });
        continue;
      }

      if (panel.type !== LENS_EMBEDDABLE_TYPE) {
        context.normalizeSkipped.push({ id: panelId, reason: 'not_lens' });
        continue;
      }

      const result = normalizeLensPanelConfig(panel.config, {
        rules: operation.rules ?? 'defects',
        colors: operation.colors ?? 'keep',
        preserve: operation.preserve,
      });

      if ('skipped' in result) {
        context.normalizeSkipped.push({ id: panelId, reason: result.skipped });
        continue;
      }

      const updateResult = updatePanelInDashboard({
        dashboardData: nextDashboardData,
        panelId,
        transformPanel: (current) => ({ ...current, config: result.config }),
      });
      if (!updateResult.updated) {
        context.normalizeSkipped.push({ id: panelId, reason: 'not_found' });
        continue;
      }

      nextDashboardData = updateResult.dashboardData;
      panelIndex.set(panelId, { ...panel, config: result.config });
      context.normalizeChanges.push(...result.changes.map((change) => ({ ...change, panelId })));
    }

    return nextDashboardData;
  },
});
