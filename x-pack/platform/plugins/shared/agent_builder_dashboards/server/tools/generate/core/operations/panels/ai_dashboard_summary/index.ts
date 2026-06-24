/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { definePanelType } from '../panel_type';

/**
 * AI Dashboard Summary panel — automatically reads all ES|QL panels on the
 * dashboard and generates a concise narrative summary of key insights.
 * No prompt or query needed; place at the top of the dashboard.
 */

export const aiDashboardSummaryConfigSchema = z.object({
  customInstructions: z
    .string()
    .max(2000)
    .optional()
    .describe(
      '(optional) Additional focus instructions, e.g. "Focus on anomalies and flag anything below target."'
    ),
});

export const aiDashboardSummaryConfigInputSchema = z.object({
  source: z.literal('config'),
  type: z.literal('ai_dashboard_summary'),
  grid: panelGridSchema,
  config: aiDashboardSummaryConfigSchema,
});

export const aiDashboardSummaryDefinition = definePanelType({
  embeddableType: 'ai_dashboard_summary',
});
