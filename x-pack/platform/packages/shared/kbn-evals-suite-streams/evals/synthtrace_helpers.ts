/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { node } from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutTestConfig } from '@kbn/scout';
import type { Moment } from 'moment';

const synthtraceScript = Path.join(REPO_ROOT, 'scripts/synthtrace.js');

function getSynthtraceArgs({
  config,
  from,
  to,
}: {
  config: ScoutTestConfig;
  from: Moment;
  to: Moment;
}): string[] {
  const esUrl = new URL(config.hosts.elasticsearch);
  const kbnUrl = new URL(config.hosts.kibana);

  esUrl.username = config.auth.username;
  esUrl.password = config.auth.password;

  kbnUrl.username = config.auth.username;
  kbnUrl.password = config.auth.password;

  return [
    `--from=${from.toISOString()}`,
    `--to=${to.toISOString()}`,
    `--kibana=${kbnUrl.toString()}`,
    `--target=${esUrl.toString()}`,
    '--assume-package-version=9.2.0',
    '--workers=1',
  ];
}

export async function indexSynthtraceScenario({
  scenario,
  scenarioOpts,
  config,
  from,
  to,
}: {
  scenario: string;
  scenarioOpts?: Record<string, string | number | boolean>;
  config: ScoutTestConfig;
  from: Moment;
  to: Moment;
}) {
  const optsArgs = Object.entries(scenarioOpts ?? {}).map(([key, value]) =>
    typeof value === 'number' || typeof value === 'boolean'
      ? `--scenarioOpts.${key}=${value}`
      : `--scenarioOpts.${key}="${value}"`
  );

  await node(
    require.resolve(synthtraceScript),
    [scenario, ...getSynthtraceArgs({ config, from, to }), ...optsArgs],
    { stdio: 'inherit' }
  );
}
