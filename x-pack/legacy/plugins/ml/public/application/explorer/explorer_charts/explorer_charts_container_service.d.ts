/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export declare interface ExplorerChartsData {
  chartsPerRow: number;
  seriesToPlot: any[];
  tooManyBuckets: boolean;
  timeFieldName: string;
}

export declare const getDefaultChartsData: () => ExplorerChartsData;

export declare const explorerChartsContainerServiceFactory: (
  callback: (data: ExplorerChartsData) => void
) => (anomalyRecords: any[], earliestMs: number, latestMs: number) => void;
