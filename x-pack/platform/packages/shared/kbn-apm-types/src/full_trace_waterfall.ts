/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WaterfallGetErrorMarkerHref } from './waterfall';

type FullTraceWaterfallScrollProps =
  | { scrollStrategy?: 'window'; contextSpanIds?: string[] }
  | { scrollStrategy: 'parent'; contextSpanIds?: string[]; scrollToContextOnMount?: boolean };

/**
 * EBT click `element` values the consumer supplies so waterfall interactions can be
 * attributed to the hosting surface (e.g. page waterfall vs flyout waterfall).
 */
export interface TraceWaterfallEbt {
  row: { element: string };
  errorBadge: { element: string };
  serviceBadge: { element: string };
  rowToggle?: { element: string };
  spanLinksBadge?: { element: string };
  errorMarker?: { element: string };
  errorMarkerMessage?: { element: string };
  foldButton?: { element: string };
  sizeWarningDiscoverLink?: { element: string };
  scrollToOrigin?: { element: string };
}

export type FullTraceWaterfallProps = {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  scrollElement?: Element;
  onNodeClick?: (nodeSpanId: string) => void;
  onErrorClick?: FullTraceWaterfallOnErrorClick;
  getErrorMarkerHref?: WaterfallGetErrorMarkerHref;
  ebt: TraceWaterfallEbt;
} & FullTraceWaterfallScrollProps;

export type FullTraceWaterfallOnErrorClick = (params: {
  traceId: string;
  docId: string;
  errorCount: number;
  errorDocId?: string;
  docIndex?: string;
}) => void;
