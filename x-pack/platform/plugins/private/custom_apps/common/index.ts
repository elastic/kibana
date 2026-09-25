/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  PLUGIN_ID,
  PLUGIN_NAME,
  CUSTOM_APP_SAVED_OBJECT_TYPE,
  API_BASE_PATH,
  GRID_SETTINGS,
  DEFAULT_PANEL_WIDTH,
  DEFAULT_PANEL_HEIGHT,
  ACTION_RUN_WORKFLOW,
  ACTION_NAVIGATE,
  SUPPORTED_ACTIONS,
} from './constants';
export type { CustomAppDefinition, CustomAppLayout, CustomAppListItem } from './app_definition';
export { customAppDefinitionSchema, getPanelIds, emptyAppDefinition } from './app_definition';
