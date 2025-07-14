/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';

export type GenAiSettingsPluginSetup = Record<string, never>;
export type GenAiSettingsPluginStart = Record<string, never>;

export class GenAiSettingsPlugin
  implements Plugin<GenAiSettingsPluginSetup, GenAiSettingsPluginStart>
{
  public setup(core: CoreSetup): GenAiSettingsPluginSetup {
    return {};
  }

  public start(core: CoreStart): GenAiSettingsPluginStart {
    return {};
  }

  public stop() {}
}
