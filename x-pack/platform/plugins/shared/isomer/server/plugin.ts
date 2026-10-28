/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { KibanaIsomerRuntime } from '@kbn/isomer';

export type IsomerPluginSetup = Record<string, never>;

export interface IsomerPluginStart {
  /** Loads the shared runtime and primitive packs on first use. */
  getRuntime: () => Promise<KibanaIsomerRuntime>;
}

const createRuntime = async (): Promise<KibanaIsomerRuntime> => {
  const [{ createKibanaIsomerRuntime }, { componentsPack }] = await Promise.all([
    import('@kbn/isomer'),
    import('@kbn/isomer-components'),
  ]);
  return createKibanaIsomerRuntime({ packs: [componentsPack] });
};

export class IsomerPlugin implements Plugin<IsomerPluginSetup, IsomerPluginStart> {
  private readonly logger: Logger;
  private runtime?: Promise<KibanaIsomerRuntime>;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(): IsomerPluginSetup {
    return {};
  }

  start(): IsomerPluginStart {
    return { getRuntime: this.getRuntime };
  }

  stop() {}

  private readonly getRuntime = (): Promise<KibanaIsomerRuntime> => {
    this.runtime ??= createRuntime().then(
      (runtime) => {
        this.logger.debug('Built the Isomer runtime with the components pack.');
        return runtime;
      },
      (error) => {
        this.runtime = undefined;
        throw error;
      }
    );
    return this.runtime;
  };
}
