/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import { IngestHubPlugin } from './plugin';
import type { IngestHubSetup, IngestHubStart } from './types';

export type {
  IngestHubSetup,
  IngestHubStart,
  IngestFlowRegistration,
  IngestFlowMountParams,
} from './types';

export { IngestFlowSteps } from './components/ingest_flow_steps';
export type { IngestFlowStep } from './components/ingest_flow_steps';

export const plugin: PluginInitializer<IngestHubSetup, IngestHubStart> = () =>
  new IngestHubPlugin();
