/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentHealthStatus } from '../utils';
import type { OTelComponentType } from '../constants';

export {
  type OTelComponentType,
  COMPONENT_TYPE_VIS_COLORS,
  COMPONENT_TYPE_LABELS,
} from '../constants';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 60;
export const RANK_SEPARATION = 80;
export const NODE_SEPARATION = 30;
export const GRAPH_MARGIN = 20;
export const GROUP_PADDING = 40;
export const DETAIL_PANEL_CONTENT_MAX_HEIGHT = 390;

export interface OTelGraphNodeData {
  label: string;
  componentType: OTelComponentType;
  pipelineId?: string;
  healthStatus?: ComponentHealthStatus;
  [key: string]: unknown;
}
