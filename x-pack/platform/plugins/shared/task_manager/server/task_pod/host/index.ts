/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { merge } from 'lodash';
import { parse } from 'yaml';
import { PodLogger } from './logger';
import { bootTasksPlugins } from './boot_tasks_plugins';
import { startPodServer } from './server';

/**
 * Entry of a pod process: boots the tasks entries of the family's plugins and serves `/health`,
 * `/run` and `/cancel`. Env: ES_URL, ES_USERNAME/ES_PASSWORD (or ES_API_KEY), PORT, POD_CONFIG (yml
 * with kibana.yml keys).
 */
export const startPod = async ({
  pluginIds,
  taskTypes,
  defaultPort,
  baseConfig = {},
}: {
  pluginIds: string[];
  /** Globs of the task types the pod serves: the family's. Other plugins' types stay with Kibana. */
  taskTypes?: string[];
  defaultPort: number;
  /** Config underneath `POD_CONFIG`, such as the keystore's settings. */
  baseConfig?: Record<string, unknown>;
}) => {
  // Without a cap, V8 sizes the young generation from the machine's heap limit and a pod can sit
  // ~100 MB higher than it needs to. `bin/kibana-task-pod` sets it.
  if (
    !`${process.env.NODE_OPTIONS ?? ''} ${process.execArgv.join(' ')}`.includes(
      'max-semi-space-size'
    )
  ) {
    new PodLogger('taskPod').warn(
      'task pod started without --max-semi-space-size; use bin/kibana-task-pod to keep memory down'
    );
  }
  const config = process.env.POD_CONFIG
    ? (parse(readFileSync(process.env.POD_CONFIG, 'utf8')) as Record<string, unknown>) ?? {}
    : {};
  const { taskDefinitions, enrichFakeRequest } = await bootTasksPlugins({
    pluginIds,
    config: merge({}, baseConfig, nestDottedKeys(config)),
  });
  return startPodServer({
    taskDefinitions,
    taskTypes,
    enrichFakeRequest,
    port: Number(process.env.PORT ?? defaultPort),
  });
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
