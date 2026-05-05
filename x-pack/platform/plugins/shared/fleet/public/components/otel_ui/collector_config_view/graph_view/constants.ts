/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { ComponentHealthStatus } from '../utils';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 60;
export const RANK_SEPARATION = 80;
export const NODE_SEPARATION = 30;
export const GRAPH_MARGIN = 20;
export const GROUP_PADDING = 40;

export type OTelComponentType = 'receiver' | 'processor' | 'connector' | 'exporter' | 'pipeline';

export interface OTelGraphNodeData {
  label: string;
  componentType: OTelComponentType;
  healthStatus?: ComponentHealthStatus;
  [key: string]: unknown;
}

export const COMPONENT_TYPE_VIS_COLORS: Record<
  OTelComponentType,
  keyof EuiThemeComputed['colors']['vis']
> = {
  receiver: 'euiColorVis0',
  processor: 'euiColorVis8',
  connector: 'euiColorVis4',
  exporter: 'euiColorVis2',
  pipeline: 'euiColorVis6',
};

export const COMPONENT_TYPE_LABELS: Record<OTelComponentType, string> = {
  receiver: i18n.translate('xpack.fleet.otelUi.componentType.receiver', {
    defaultMessage: 'Receiver',
  }),
  processor: i18n.translate('xpack.fleet.otelUi.componentType.processor', {
    defaultMessage: 'Processor',
  }),
  connector: i18n.translate('xpack.fleet.otelUi.componentType.connector', {
    defaultMessage: 'Connector',
  }),
  exporter: i18n.translate('xpack.fleet.otelUi.componentType.exporter', {
    defaultMessage: 'Exporter',
  }),
  pipeline: i18n.translate('xpack.fleet.otelUi.componentType.pipeline', {
    defaultMessage: 'Pipeline',
  }),
};
