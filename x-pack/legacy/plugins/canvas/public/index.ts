/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginInitializer,
  PluginInitializerContext,
  CoreStart,
} from '../../../../../src/core/public';
import { CanvasSetup, CanvasStart, CanvasSetupDeps, CanvasStartDeps, CanvasPlugin } from './plugin';

export const plugin: PluginInitializer<
  CanvasSetup,
  CanvasStart,
  CanvasSetupDeps,
  CanvasStartDeps
> = (initializerContext: PluginInitializerContext) => {
  return new CanvasPlugin();
};

export interface WithKibanaProps {
  kibana: {
    services: CoreStart & CanvasStartDeps;
  };
}

// These are your public types & static code
export { CanvasSetup, CanvasStart };
