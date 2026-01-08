/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils/config_builder';

/** Represents a planned visualization panel */
export interface PlannedPanel {
  description: string;
  title?: string;
}

/** Action types for tracking graph execution */
export interface PlanVisualizationsAction {
  type: 'plan_visualizations';
  success: boolean;
  plannedPanels?: PlannedPanel[];
  error?: string;
}

export interface CreateVisualizationAction {
  type: 'create_visualization';
  success: boolean;
  panelIndex: number;
  config?: LensApiSchemaType;
  error?: string;
}

export interface DiscoverDataAction {
  type: 'discover_data';
  success: boolean;
  discoveredIndex?: string;
  fieldCount?: number;
  error?: string;
}

export interface FinalizeAction {
  type: 'finalize';
  success: boolean;
  dashboardUrl?: string;
  error?: string;
}

export type Action =
  | DiscoverDataAction
  | PlanVisualizationsAction
  | CreateVisualizationAction
  | FinalizeAction;
