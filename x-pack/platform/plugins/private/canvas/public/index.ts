/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import type { CoreStart } from '@kbn/core/public';
import type { CanvasServices } from './services';
import { type CanvasSetup, type CanvasStart, type CanvasStartDeps, CanvasPlugin } from './plugin';

export type { CanvasSetup, CanvasStart };

export interface WithKibanaProps {
  kibana: {
    services: CoreStart & CanvasStartDeps & { canvas: CanvasServices };
  };
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new CanvasPlugin(initializerContext);
