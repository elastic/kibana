/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'customApps';
export const PLUGIN_NAME = 'Custom Apps';

export const CUSTOM_APP_SAVED_OBJECT_TYPE = 'custom_app';

export const API_BASE_PATH = '/internal/custom_apps';

/** Grid settings, matching the dashboard's so apps feel the same to use. */
export const GRID_SETTINGS = {
  gutterSize: 8,
  rowHeight: 20,
  columnCount: 48,
  keyboardDragTopLimit: 150,
};

export const DEFAULT_PANEL_WIDTH = 24;
export const DEFAULT_PANEL_HEIGHT = 15;

/**
 * The only action events a custom app may dispatch. Anything else is rejected
 * so a generated document cannot reach arbitrary Kibana behaviour.
 */
export const ACTION_RUN_WORKFLOW = 'kbn.runWorkflow';
export const ACTION_NAVIGATE = 'kbn.navigate';
export const SUPPORTED_ACTIONS = [ACTION_RUN_WORKFLOW, ACTION_NAVIGATE] as const;
