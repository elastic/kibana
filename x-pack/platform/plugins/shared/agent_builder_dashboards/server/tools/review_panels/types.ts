/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/agent-builder-server';
import type { PanelCatalogEntry } from './catalog_dashboard_panels';

export type PanelReviewRule = 'disproportionate_size' | 'wrong_chart_type';

export interface PanelFinding {
  panel_id: string;
  rule: PanelReviewRule;
  what: string;
  fix: string;
}

export interface DashboardImage {
  bytes: Buffer;
  mimeType: string;
}

export type InspectDashboardImage = (args: {
  panels: PanelCatalogEntry[];
  image: DashboardImage;
  modelProvider: ModelProvider;
}) => Promise<PanelFinding[]>;
