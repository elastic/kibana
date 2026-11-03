/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { KibanaIsomerRuntime } from '@kbn/isomer';

const createRuntime = async (): Promise<KibanaIsomerRuntime> => {
  const [{ createKibanaIsomerRuntime }, { componentsPack }] = await Promise.all([
    import('@kbn/isomer'),
    import('@kbn/isomer-components'),
  ]);
  return createKibanaIsomerRuntime({ packs: [componentsPack] });
};

/**
 * Builds the shared Isomer runtime with the components pack on first use. The plugin provides it in
 * Kibana and its tasks entry in a task pod, so both render the same way.
 */
export const createIsomerRuntimeProvider = (logger: Logger) => {
  let runtime: Promise<KibanaIsomerRuntime> | undefined;
  return {
    getRuntime: (): Promise<KibanaIsomerRuntime> => {
      runtime ??= createRuntime().then(
        (built) => {
          logger.debug('Built the Isomer runtime with the components pack.');
          return built;
        },
        (error) => {
          runtime = undefined;
          throw error;
        }
      );
      return runtime;
    },
  };
};
