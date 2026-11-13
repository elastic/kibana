/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptivePanel } from '../../../model/adaptive_dashboard';

import { deepLinkFor, type LowerPanelArgs } from './types';

interface MapAttributes {
  title?: string;
  description?: string;
  layerListJSON?: string;
}

export const lowerMapPanel = ({
  panel,
  panelEnvelope,
  refId,
  kibanaBaseUrl,
  diagnostics,
}: LowerPanelArgs): AdaptivePanel => {
  const title =
    panel.title ?? (panelEnvelope?.attributes as MapAttributes | undefined)?.title ?? 'Map';
  const deepLink = deepLinkFor('map', refId, kibanaBaseUrl) ?? `kibana://map/${refId ?? 'unknown'}`;
  diagnostics.push({
    level: 'info',
    code: 'dashboard.map-degraded-to-deeplink',
    message: `map panel "${title}" rendered as a deep-link callout (no snapshot service wired)`,
  });
  return {
    type: 'maps',
    title,
    deepLink,
  };
};
