/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdaptivePanel } from '../../../model/adaptive_dashboard';
import type { DiagnosticBag } from '../../lens/diagnostics';
import type { LensColumnFormat } from '../../lens/format_resolver';
import type { SavedObjectEnvelope } from '../../ndjson';
import type { DashboardPanel } from '../types';

export interface LowerPanelArgs {
  panel: DashboardPanel;
  panelEnvelope?: SavedObjectEnvelope | undefined;
  refType?: string | undefined;
  refId?: string | undefined;
  kibanaBaseUrl?: string | undefined;
  diagnostics: DiagnosticBag;
  resolveReferenceTitle?:
    | ((name: string, id: string, type: string) => string | undefined)
    | undefined;
  resolveDataViewFieldFormats?:
    | ((name: string, id: string, type: string) => Record<string, LensColumnFormat> | undefined)
    | undefined;
}

export type PanelLowerer = (args: LowerPanelArgs) => AdaptivePanel;

export const deepLinkFor = (
  refType: string | undefined,
  refId: string | undefined,
  kibanaBaseUrl: string | undefined
): string | undefined => {
  if (!kibanaBaseUrl || !refType || !refId) {
    return undefined;
  }
  const base = kibanaBaseUrl.replace(/\/$/, '');
  switch (refType) {
    case 'lens':
    case 'vis':
      return `${base}/app/lens#/edit/${encodeURIComponent(refId)}`;
    case 'map':
      return `${base}/app/maps/map/${encodeURIComponent(refId)}`;
    case 'search':
      return `${base}/app/discover#/view/${encodeURIComponent(refId)}`;
    case 'links':
      return `${base}/app/dashboards#/links/${encodeURIComponent(refId)}`;
    case 'visualization':
    case 'legacy_vis':
      return `${base}/app/visualize#/edit/${encodeURIComponent(refId)}`;
    default:
      return `${base}/app/management/kibana/objects/savedObjects/edit/${encodeURIComponent(
        refType
      )}/${encodeURIComponent(refId)}`;
  }
};

export const unsupportedPanel = ({
  panel,
  refType,
  refId,
  kibanaBaseUrl,
  reason,
  title,
}: LowerPanelArgs & { reason: string; title?: string }): AdaptivePanel => {
  const link = deepLinkFor(refType, refId, kibanaBaseUrl);
  return {
    type: 'unsupported',
    reason,
    ...(title ?? panel.title ? { title: title ?? panel.title } : {}),
    ...(link ? { deepLink: link } : {}),
  };
};
