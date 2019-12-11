/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { PluginInitializerContext } from 'kibana/public';
import { plugin } from './new_platform_index';

export { useTrackPageview } from './hooks/use_track_metric';

const { core, plugins } = npStart;
const __LEGACY = {};

plugin({} as PluginInitializerContext).start(core, plugins, __LEGACY);
