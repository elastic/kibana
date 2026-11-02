/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { PodLogger } from './logger';
import type { PodPluginDefinition } from './define_pod_plugin';
import { bootPod } from './plugin_system';
import { startPodServer } from './server';

export { definePodPlugin } from './define_pod_plugin';
export type { PodPluginDefinition, PodPluginInitializerContext } from './define_pod_plugin';
export { callKibana, remoteContract } from './remote';

/**
 * Entry of a pod process: boots the pod plugins and serves `/health`, `/run` and `/cancel`.
 * Env: ES_URL, ES_USERNAME/ES_PASSWORD (or ES_API_KEY), PORT, POD_CONFIG (yml with kibana.yml keys).
 */
export const startPod = async ({
  plugins,
  defaultPort,
}: {
  plugins: PodPluginDefinition[];
  defaultPort: number;
}) => {
  // Without a cap, V8 sizes the young generation from the machine's heap limit and a pod can sit
  // ~100 MB higher than it needs to. The build script emits a launcher that sets it.
  if (
    !`${process.env.NODE_OPTIONS ?? ''} ${process.execArgv.join(' ')}`.includes(
      'max-semi-space-size'
    )
  ) {
    new PodLogger('taskPod').warn(
      'task pod started without --max-semi-space-size; use the .sh launcher the build wrote to keep memory down'
    );
  }
  const config = process.env.POD_CONFIG
    ? (parse(readFileSync(process.env.POD_CONFIG, 'utf8')) as Record<string, unknown>) ?? {}
    : {};
  const { taskDefinitions } = await bootPod({ plugins, config: nestDottedKeys(config) });
  startPodServer({ taskDefinitions, port: Number(process.env.PORT ?? defaultPort) });
};

/** Accepts both `xpack.alerting_v2.x: 1` and nested yml, like kibana.yml does. */
const nestDottedKeys = (flat: Record<string, unknown>): Record<string, unknown> => {
  const nested: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let cursor = nested;
    parts.slice(0, -1).forEach((part) => {
      cursor = (cursor[part] ??= {}) as Record<string, unknown>;
    });
    cursor[parts[parts.length - 1]] = value;
  }
  return nested;
};
