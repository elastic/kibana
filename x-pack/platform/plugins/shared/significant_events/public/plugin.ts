/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { registerSignificantEventFeatureAttachment } from './agent_builder/feature_attachment';
import { registerSignificantEventDetectionAttachment } from './agent_builder/detection_attachment';
import type {
  SignificantEventsPublicPluginSetupDependencies,
  SignificantEventsPublicPluginStartDependencies,
} from './types';

export type SignificantEventsPublicPluginSetup = Record<string, never>;
export type SignificantEventsPublicPluginStart = Record<string, never>;

export class SignificantEventsPublicPlugin
  implements
    Plugin<
      SignificantEventsPublicPluginSetup,
      SignificantEventsPublicPluginStart,
      SignificantEventsPublicPluginSetupDependencies,
      SignificantEventsPublicPluginStartDependencies
    >
{
  constructor(_ctx: PluginInitializerContext) {}

  setup(_core: CoreSetup): SignificantEventsPublicPluginSetup {
    return {};
  }

  start(
    _core: CoreStart,
    plugins: SignificantEventsPublicPluginStartDependencies
  ): SignificantEventsPublicPluginStart {
    if (plugins.agentBuilder) {
      registerSignificantEventFeatureAttachment({ agentBuilder: plugins.agentBuilder });
      registerSignificantEventDetectionAttachment({ agentBuilder: plugins.agentBuilder });
    }

    return {};
  }
}
