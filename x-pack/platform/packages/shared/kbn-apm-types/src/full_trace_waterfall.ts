/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface FullTraceWaterfallProps {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  serviceName: string;
  scrollElement?: Element;
  onNodeClick?: (nodeSpanId: string) => void;
  onErrorClick?: FullTraceWaterfallOnErrorClick;
}

export type FullTraceWaterfallOnErrorClick = (params: {
  traceId: string;
  docId: string;
  errorCount: number;
  errorDocId?: string;
  docIndex?: string;
}) => void;
