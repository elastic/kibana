/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum WaterfallLegendType {
  ServiceName = 'serviceName',
  Type = 'type',
}

export interface IWaterfallLegend {
  type: WaterfallLegendType;
  value: string | undefined;
  color: string;
}

export type IWaterfallGetRelatedErrorsHref = (docId: string) => string;
export type WaterfallGetServiceBadgeHref = (serviceName: string) => string;
export type WaterfallGetErrorMarkerHref = (params: {
  serviceName: string;
  errorGroupId: string;
  traceId?: string;
  transactionId?: string;
}) => string;
