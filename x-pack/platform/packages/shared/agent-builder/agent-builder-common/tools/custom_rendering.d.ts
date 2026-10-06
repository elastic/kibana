/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartType } from '@kbn/visualization-utils';
export interface VisualizationElementAttributes {
  toolResultId?: string;
  chartType?: ChartType;
}
export declare const visualizationElement: {
  tagName: string;
  attributes: {
    toolResultId: string;
    chartType: string;
  };
};
export interface DashboardElementAttributes {
  toolResultId?: string;
}
export declare const dashboardElement: {
  tagName: string;
  attributes: {
    toolResultId: string;
  };
};
export interface RenderAttachmentElementAttributes {
  attachmentId?: string;
  version?: number | string;
}
export declare const renderAttachmentElement: {
  tagName: string;
  attributes: {
    attachmentId: string;
    version: string;
  };
};
export interface RenderElementAttributes {
  path?: string;
  type?: string;
}
export declare const renderElement: {
  tagName: string;
  attributes: {
    path: string;
    type: string;
  };
};
