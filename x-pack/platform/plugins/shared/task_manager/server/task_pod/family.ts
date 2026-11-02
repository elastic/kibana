/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';

/** A task pod family: the plugins whose `server/tasks` entries one pod process boots. */
export interface TaskPodFamily {
  family: string;
  taskTypes: string[];
  plugins: string[];
}

/** Family name -> id of the plugin that owns its `task_pod.jsonc`. */
export const FAMILY_OWNERS: Record<string, string> = {
  alerting_v2: 'alertingVTwo',
};

export const loadFamily = (name: string): TaskPodFamily => {
  const owner = FAMILY_OWNERS[name];
  if (!owner) {
    throw new Error(
      `Unknown task pod family '${name}'. Known families: ${Object.keys(FAMILY_OWNERS).join(', ')}`
    );
  }
  const pkg = getPackages(REPO_ROOT).find(
    (p) => p.manifest.type === 'plugin' && p.manifest.plugin.id === owner
  );
  if (!pkg) throw new Error(`Plugin '${owner}' that owns the '${name}' family was not found`);
  const text = readFileSync(join(pkg.directory, 'task_pod.jsonc'), 'utf8');
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, '')) as TaskPodFamily;
};
