/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptivePanel } from '../../model/adaptive_dashboard';

import { isVisualizationPanelType } from './panel_types';
import { lowerImagePanel } from './panels/image';
import { lowerLinksPanel } from './panels/links';
import { lowerMapPanel } from './panels/map';
import { lowerSavedSearchPanel } from './panels/saved_search';
import { type LowerPanelArgs, unsupportedPanel } from './panels/types';
import { lowerVisualizationPanel } from './panels/visualization';

export const lowerLongTailPanel = (args: LowerPanelArgs): AdaptivePanel => {
  const { panel, refType } = args;
  if (isVisualizationPanelType(refType)) {
    return lowerVisualizationPanel(args);
  }
  switch (refType) {
    case 'links':
      return lowerLinksPanel(args);
    case 'image':
      return lowerImagePanel(args);
    case 'map':
      return lowerMapPanel(args);
    case 'search':
      return lowerSavedSearchPanel(args);
    default:
      args.diagnostics.push({
        level: 'warn',
        code: 'dashboard.unknown-panel-type',
        message: `unknown panel type "${refType ?? '<unset>'}" lowered as "unsupported"`,
      });
      return unsupportedPanel({
        ...args,
        reason: `panel type "${refType ?? panel.type}" is not handled`,
      });
  }
};
