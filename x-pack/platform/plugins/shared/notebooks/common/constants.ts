/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'notebook';
export const APP_ID = 'notebook';
export const APP_ROUTE = '/app/notebooks';
export const NOTEBOOK_SAVED_OBJECT_TYPE = 'notebook';
export const NOTEBOOK_API_BASE_PATH = '/internal/notebook';
export const MAX_DESCRIPTION_LENGTH = 10_000;
export const MAX_TITLE_LENGTH = 1024;
export const MAX_CELL_HEIGHT = 5000;

/** Query parameter that opens the notebook with the app panel showing this app. */
export const NOTEBOOK_APP_PARAM = 'app';

/** The in-app path that opens a saved notebook, with the app panel showing `appId` when given. */
export const getNotebookPath = (notebookId: string, appId?: string): string => {
  const path = `/${encodeURIComponent(notebookId)}`;
  return appId ? `${path}?${new URLSearchParams({ [NOTEBOOK_APP_PARAM]: appId })}` : path;
};

/** The in-app path that shows one of a saved notebook's apps on its own. */
export const getNotebookAppPath = (notebookId: string, appId: string): string =>
  `/${encodeURIComponent(notebookId)}/apps/${encodeURIComponent(appId)}`;

export const PLUGIN_NAME = i18n.translate('xpack.notebook.pluginName', {
  defaultMessage: 'Notebooks',
});

/** Without snap to grid, panels move and resize in steps of this fraction of a grid cell. */
export const GRID_SUBDIVISIONS = 10;

export const DEFAULT_GRID_COLUMNS = 12;
export const MIN_GRID_COLUMNS = 1;
export const MAX_GRID_COLUMNS = 48;

/** The space between an app's panels, in pixels. */
export const DEFAULT_GRID_GAP = 8;
export const MAX_GRID_GAP = 64;

/** A hex color such as `#fff`, `#ffffff` or `#ffffff80`. */
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
