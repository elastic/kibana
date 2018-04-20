/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import {
  KIBANA_FTR_SCRIPT,
  PROJECT_ROOT
} from './paths';

export async function runFtr({ procs, configPath, bail }) {
  const args = [KIBANA_FTR_SCRIPT, '--debug'];

  if (configPath) {
    args.push('--config', configPath);
  }

  if (bail) {
    args.push('--bail');
  }

  await procs.run('ftr', {
    cmd: 'node',
    args,
    cwd: PROJECT_ROOT,
    wait: true
  });
}
