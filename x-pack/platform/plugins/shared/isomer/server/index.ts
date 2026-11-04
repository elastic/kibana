/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { IsomerPlugin } = await import('./plugin');
  return new IsomerPlugin(initializerContext);
};

export type { AsScopedOptions, IsomerPluginSetup, IsomerPluginStart } from './plugin';
export type { KibanaIsomerRuntime } from '@kbn/isomer';
export type {
  MaterializeByReference,
  MaterializeByValue,
  MaterializeContext,
  MaterializeInput,
} from '../common';
export type {
  ChartCell,
  ChartEvent,
  MaterializedChartNode,
  MaterializedComponentNode,
  MaterializedNode,
  MaterializedNodeSource,
  MaterializeLoss,
  UnsupportedNode,
} from './materialize/nodes';
export type {
  AggsDataRequest,
  DataRequest,
  EsqlDataRequest,
  EsqlParamValue,
  MaterializeContextOverride,
  MaterializeDataRequest,
  MaterializeDescription,
  MaterializeKit,
  MaterializeResults,
  MaterializeScope,
  Materializer,
  ScopedMaterializeClient,
  SearchDataRequest,
} from './materialize/types';
