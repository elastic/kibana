/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

/** Initializes the server-only Isomer plugin. */
export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { IsomerPlugin } = await import('./plugin');
  return new IsomerPlugin(initializerContext);
};

/** Isomer plugin setup and start contracts. */
export type { AsScopedOptions, IsomerPluginSetup, IsomerPluginStart } from './plugin';
/** Runtime type returned by the lazy `getRuntime` contract. */
export type { KibanaIsomerRuntime } from '@kbn/isomer';
/** Materialization input and context types shared with the public API. */
export type { MaterializeContext, MaterializeInput } from '../common';
/** Node and event types exposed by the materialization client. */
export type { ChartEvent, MaterializedNode, UnsupportedNode } from './materialize/nodes';
/** Types required to implement and consume a materializer. */
export type {
  DataRequest,
  MaterializeContextOverride,
  MaterializeDescription,
  MaterializeKit,
  MaterializeResults,
  MaterializeScope,
  Materializer,
  ScopedMaterializeClient,
} from './materialize/types';
