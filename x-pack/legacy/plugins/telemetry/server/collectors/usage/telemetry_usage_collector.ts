/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { accessSync, constants, readFileSync, statSync } from 'fs';
import { Server } from 'hapi';
import { safeLoad } from 'js-yaml';
import { dirname, join } from 'path';

// look for telemetry.yml in the same places we expect kibana.yml
import { ensureDeepObject } from './ensure_deep_object';
import { getXpackConfigWithDeprecated } from '../../../common/get_xpack_config_with_deprecated';

/**
 * The maximum file size before we ignore it (note: this limit is arbitrary).
 */
export const MAX_FILE_SIZE = 10 * 1024; // 10 KB

export interface KibanaHapiServer extends Server {
  usage: {
    collectorSet: {
      makeUsageCollector: (collector: object) => any;
    };
  };
}

/**
 * Determine if the supplied `path` is readable.
 *
 * @param path The possible path where a config file may exist.
 * @returns `true` if the file should be used.
 */
export function isFileReadable(path: string): boolean {
  try {
    accessSync(path, constants.R_OK);

    // ignore files above the limit
    const stats = statSync(path);
    return stats.size <= MAX_FILE_SIZE;
  } catch (e) {
    return false;
  }
}

/**
 * Load the `telemetry.yml` file, if it exists, and return its contents as
 * a JSON object.
 *
 * @param configPath The config file path.
 * @returns The unmodified JSON object if the file exists and is a valid YAML file.
 */
export async function readTelemetryFile(path: string): Promise<object | undefined> {
  try {
    if (isFileReadable(path)) {
      const yaml = readFileSync(path);
      const data = safeLoad(yaml.toString());

      // don't bother returning empty objects
      if (Object.keys(data).length) {
        // ensure { "a.b": "value" } becomes { "a": { "b": "value" } }
        return ensureDeepObject(data);
      }
    }
  } catch (e) {
    // ignored
  }

  return undefined;
}

/**
 * Create a usage collector that provides the `telemetry.yml` data as a
 * `static_telemetry` object.
 *
 * Loading of the file is done lazily and on-demand. This avoids hanging
 * onto the data in memory unnecessarily, as well as allows it to be
 * updated out-of-process without having to restart Kibana.
 *
 * @param server The Kibana server instance.
 * @return `UsageCollector` that provides the `static_telemetry` described.
 */
export function createTelemetryUsageCollector(server: KibanaHapiServer) {
  return server.usage.collectorSet.makeUsageCollector({
    type: 'static_telemetry',
    isReady: () => true,
    fetch: async () => {
      const config = server.config();
      const configPath = getXpackConfigWithDeprecated(config, 'telemetry.config') as string;
      const telemetryPath = join(dirname(configPath), 'telemetry.yml');
      return await readTelemetryFile(telemetryPath);
    },
  });
}
