/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { SampleDataIngestPlugin } from './plugin';
import type { SampleDataIngestPluginSetup, SampleDataIngestPluginStart } from './types';

export type { SampleDataIngestPluginSetup, SampleDataIngestPluginStart };

export const plugin: PluginInitializer<SampleDataIngestPluginSetup, SampleDataIngestPluginStart> = (
  pluginInitializerContext: PluginInitializerContext
) => new SampleDataIngestPlugin(pluginInitializerContext);
