/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { createKibanaIsomerRuntime, type KibanaIsomerRuntime } from '@kbn/isomer';
import { componentsPack } from '@kbn/isomer-components';

export type IsomerPluginSetup = Record<string, never>;

export interface IsomerPluginStart {
  /** Validates and renders compositions built from Kibana's primitive packs. */
  runtime: KibanaIsomerRuntime;
}

export class IsomerPlugin implements Plugin<IsomerPluginSetup, IsomerPluginStart> {
  private readonly logger: Logger;
  private readonly runtime: KibanaIsomerRuntime;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.runtime = createKibanaIsomerRuntime({ packs: [componentsPack] });
  }

  setup(): IsomerPluginSetup {
    return {};
  }

  start(): IsomerPluginStart {
    this.logger.debug('Isomer runtime started with the components pack.');
    return { runtime: this.runtime };
  }

  stop() {}
}
