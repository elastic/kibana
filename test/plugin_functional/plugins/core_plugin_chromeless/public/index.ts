/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializer } from 'kibana/public';
import {
  CorePluginChromelessPlugin,
  CorePluginChromelessPluginSetup,
  CorePluginChromelessPluginStart,
} from './plugin';

export const plugin: PluginInitializer<
  CorePluginChromelessPluginSetup,
  CorePluginChromelessPluginStart
> = () => new CorePluginChromelessPlugin();
