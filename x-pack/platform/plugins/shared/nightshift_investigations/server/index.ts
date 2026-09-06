/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export { config } from './config';
export type { NightshiftInvestigationsConfig } from './config';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { NightshiftInvestigationsPlugin } = await import('./plugin');
  return new NightshiftInvestigationsPlugin(initializerContext);
}

export type {
  NightshiftInvestigationsServerSetup,
  NightshiftInvestigationsServerStart,
} from './types';
export type { GetInvestigationResponse } from '../common';

export { alertSnapshotSchema, type AlertSnapshot } from '../common';

export { InvestigationUnavailableError } from './client/errors';

export type { NightshiftInvestigationsRouteRepository } from './routes';
