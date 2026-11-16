/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, PluginInitializer } from '@kbn/core/public';
import { IngestHubPlugin } from './plugin';
import type { IngestHubSetup, IngestHubStart, IngestHubStartDependencies } from './types';

export type { IngestHubSetup, IngestHubStart, IngestFlow } from './types';

export { LazyAddIntegrationModal } from './add_integration_modal/lazy';
export type { AddIntegrationModalProps } from './add_integration_modal';
// Re-exported so hosts of the modal do not need a Fleet dependency of their own.
export type { IntegrationCardItem } from '@kbn/fleet-plugin/public';

export const plugin: PluginInitializer<
  IngestHubSetup,
  IngestHubStart,
  object,
  IngestHubStartDependencies
> = (context: PluginInitializerContext) => new IngestHubPlugin(context);
