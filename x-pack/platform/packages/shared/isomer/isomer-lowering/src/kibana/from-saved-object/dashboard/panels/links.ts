/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptivePanel } from '../../../model/adaptive_dashboard';

import { type LowerPanelArgs, unsupportedPanel } from './types';

interface LinksAttributes {
  title?: string;
  links?: Array<{
    id?: string;
    type?: string;
    label?: string;
    destination?: string;
    options?: { openInNewTab?: boolean };
    destinationRefName?: string;
  }>;
}

export const lowerLinksPanel = ({
  panel,
  panelEnvelope,
  refId,
  diagnostics,
  ...rest
}: LowerPanelArgs): AdaptivePanel => {
  const attributes = panelEnvelope?.attributes as LinksAttributes | undefined;
  const links = attributes?.links ?? [];
  if (links.length === 0) {
    diagnostics.push({
      level: 'warn',
      code: 'dashboard.links-empty',
      message: `links panel "${refId ?? '<inline>'}" has no link items`,
    });
    return unsupportedPanel({
      panel,
      panelEnvelope,
      refId,
      diagnostics,
      ...rest,
      refType: 'links',
      reason: 'links panel has no items',
    });
  }
  return {
    type: 'links',
    title: panel.title ?? attributes?.title ?? 'Links',
    items: links.map((link, index) => ({
      label: link.label ?? `Link #${index + 1}`,
      href: link.destination ?? '#',
    })),
  };
};
