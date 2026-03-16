/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/public';
import { IngestHubPlugin } from './plugin';
import type { IngestHubSetup } from './types';

export type { IngestHubSetup, IngestFlowRegistration, IngestFlowProps } from './types';

export const plugin: PluginInitializer<IngestHubSetup> = () => new IngestHubPlugin();
