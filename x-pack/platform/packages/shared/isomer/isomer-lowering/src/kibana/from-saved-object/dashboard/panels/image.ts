/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptivePanel } from '../../../model/adaptive_dashboard';

import { type LowerPanelArgs, unsupportedPanel } from './types';

interface ImageAttributes {
  description?: string;
  imageConfig?: {
    src?: { type?: string; url?: string };
    altText?: string;
    backgroundColor?: string;
    sizing?: { objectFit?: string };
  };
}

export const lowerImagePanel = ({
  panel,
  panelEnvelope,
  refId,
  diagnostics,
  ...rest
}: LowerPanelArgs): AdaptivePanel => {
  const inline = panel.embeddableConfig as ImageAttributes | undefined;
  const fromEnvelope = panelEnvelope?.attributes as ImageAttributes | undefined;
  const config = fromEnvelope?.imageConfig ?? inline?.imageConfig;
  const src = config?.src?.url;
  if (!src) {
    diagnostics.push({
      level: 'warn',
      code: 'dashboard.image-missing-src',
      message: 'image panel has no `imageConfig.src.url`',
    });
    return unsupportedPanel({
      panel,
      panelEnvelope,
      refId,
      diagnostics,
      ...rest,
      refType: 'image',
      reason: 'image panel has no resolvable source URL',
    });
  }
  return {
    type: 'image',
    src,
    ...(config?.altText ? { alt: config.altText } : {}),
    ...(panel.title ? { caption: panel.title } : {}),
  };
};
