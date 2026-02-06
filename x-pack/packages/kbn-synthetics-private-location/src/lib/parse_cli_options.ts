/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import { DEFAULTS } from '../constants';
import type { CliOptions } from '../types';

function readKibanaDevConfig(): {
  kibanaBasePath?: string;
  kibanaUsername?: string;
  kibanaPassword?: string;
} {
  // Try same resolution order as sync_logs.js
  const candidates = [path.resolve(process.cwd(), `${REPO_ROOT}/config/kibana.dev.yml`)];
  let configPath: string | undefined;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      configPath = p;
      break;
    }
  }
  if (!configPath) return {};

  try {
    const loaded = (yaml.load(fs.readFileSync(configPath, 'utf8')) || {}) as any;
    const out: any = {};

    // server.host / server.port or flat keys like 'server.host'
    if (loaded.server && typeof loaded.server === 'object') {
      const basePath = loaded.server.basePath;
      out.kibanaBasePath = basePath && String(basePath).trim() ? String(basePath) : undefined;
    }
    const basePath = loaded['server.basePath'];
    if (basePath) {
      out.kibanaBasePath = basePath && String(basePath).trim() ? String(basePath) : undefined;
    }

    // credentials — commonly in kibana.dev.yml under elasticsearch.* (used by Kibana),
    // use those if present for username/password fallback
    if (loaded.elasticsearch && typeof loaded.elasticsearch === 'object') {
      if (loaded.elasticsearch.username) out.kibanaUsername = loaded.elasticsearch.username;
      if (loaded.elasticsearch.password) out.kibanaPassword = loaded.elasticsearch.password;
    } else {
      if (loaded['elasticsearch.username']) out.kibanaUsername = loaded['elasticsearch.username'];
      if (loaded['elasticsearch.password']) out.kibanaPassword = loaded['elasticsearch.password'];
    }

    return out;
  } catch (err) {
    // If parsing fails, silently return empty so we fall back to DEFAULTS
    return {};
  }
}

export function parseCliOptions(): CliOptions {
  const program = new Command();
  program
    .name('synthetics_private_location.js')
    .description(
      'A script to start Fleet Server, enroll Elastic Agent, and create a Synthetics private location'
    )
    .option(
      '--elasticsearch-host <address>',
      'The address to the Elasticsearch cluster',
      DEFAULTS.ELASTICSEARCH_HOST
    )
    // don't set defaults for kibana flags here so we can tell if user provided them
    .option('--kibana-url <address>', 'The address to the Kibana server')
    .option('--kibana-username <username>', 'The username for the Kibana server')
    .option('--kibana-password <password>', 'The password for the Kibana server')
    .option(
      '--location-name <name>',
      'The name of the Synthetics private location',
      DEFAULTS.LOCATION_NAME
    )
    .option(
      '--agent-policy-name <name>',
      'The name of the agent policy',
      DEFAULTS.AGENT_POLICY_NAME
    );

  program.parse(process.argv);
  const opts = program.opts() as Partial<CliOptions>;

  // If user didn't provide kibana-specific CLI flags, attempt to read config/kibana.dev.yml
  const kibanaConfig = readKibanaDevConfig();

  const kibanaUrl =
    opts.kibanaUrl && String(opts.kibanaUrl).trim()
      ? String(opts.kibanaUrl)
      : DEFAULTS.KIBANA_URL + (kibanaConfig.kibanaBasePath || '');

  const kibanaUsername =
    opts.kibanaUsername && String(opts.kibanaUsername).trim()
      ? String(opts.kibanaUsername)
      : kibanaConfig.kibanaUsername || DEFAULTS.KIBANA_USERNAME;

  const kibanaPassword =
    opts.kibanaPassword && String(opts.kibanaPassword).trim()
      ? String(opts.kibanaPassword)
      : kibanaConfig.kibanaPassword || DEFAULTS.KIBANA_PASSWORD;

  return {
    elasticsearchHost: (opts.elasticsearchHost as string) || DEFAULTS.ELASTICSEARCH_HOST,
    kibanaUrl,
    kibanaUsername:
      kibanaUsername === 'kibana_system_user' ? DEFAULTS.KIBANA_USERNAME : kibanaUsername,
    kibanaPassword,
    locationName: (opts.locationName as string) || DEFAULTS.LOCATION_NAME,
    agentPolicyName: (opts.agentPolicyName as string) || DEFAULTS.AGENT_POLICY_NAME,
  } as CliOptions;
}
