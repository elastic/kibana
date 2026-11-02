/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam — ES connection bootstrap for the worker.
 *
 * Core does not expose its resolved elasticsearch.* config (credentials) to
 * plugins, and QAF serverless deployments cannot inject env vars. So the
 * executor-side bridge re-derives the ES connection the same way core does,
 * in precedence order:
 *
 *   1. TM_POC_ES_* env vars (local-dev escape hatch)
 *   2. CLI longopts (--elasticsearch.hosts=…), which is also what the docker
 *      entrypoint turns ELASTICSEARCH_* env vars into
 *   3. Kibana config files: every `-c/--config` argv occurrence in order,
 *      falling back to $KBN_PATH_CONF/kibana.yml
 *
 * KNOWN GAP (PoC): values stored only in the kibana.keystore are invisible
 * here. If a cloud environment keeps elasticsearch.serviceAccountToken in the
 * keystore rather than a mounted config file, this resolver will come up
 * empty — surfaced loudly in the log line (auth=none).
 *
 * SECURITY: resolved secrets are never logged; `describe()` redacts.
 */

import { existsSync, readFileSync } from 'fs';
import Path from 'path';
import { parse as parseYaml } from 'yaml';

export interface PocEsConnection {
  node: string;
  username?: string;
  password?: string;
  serviceAccountToken?: string;
  caPaths: string[];
  rejectUnauthorized: boolean;
  /** Where each field came from, for diagnostics (never contains secrets). */
  sources: string[];
}

type FlatConfig = Map<string, unknown>;

/** Flattens nested yaml maps into dotted keys; dotted keys pass through. */
function flattenInto(flat: FlatConfig, value: unknown, prefix: string) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      flattenInto(flat, child, prefix ? `${prefix}.${key}` : key);
    }
    return;
  }
  flat.set(prefix, value);
}

function readConfigFile(path: string): FlatConfig | undefined {
  try {
    const parsed = parseYaml(readFileSync(path, 'utf8'));
    const flat: FlatConfig = new Map();
    flattenInto(flat, parsed ?? {}, '');
    return flat;
  } catch {
    return undefined;
  }
}

/** Config file candidates: argv -c/--config occurrences, else KBN_PATH_CONF/kibana.yml. */
export function getConfigFileCandidates(argv: string[], env: NodeJS.ProcessEnv): string[] {
  const fromArgv: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-c' || arg === '--config') {
      if (argv[i + 1]) fromArgv.push(argv[i + 1]);
    } else if (arg.startsWith('--config=')) {
      fromArgv.push(arg.slice('--config='.length));
    }
  }
  if (fromArgv.length > 0) return fromArgv;

  const confDir = env.KBN_PATH_CONF ?? Path.resolve(process.cwd(), 'config');
  return [Path.resolve(confDir, 'kibana.yml')];
}

/** CLI longopt overrides: --elasticsearch.hosts=… or --elasticsearch.hosts … */
function getArgvOverrides(argv: string[]): FlatConfig {
  const flat: FlatConfig = new Map();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--elasticsearch.')) continue;
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      flat.set(arg.slice(2, eq), arg.slice(eq + 1));
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      flat.set(arg.slice(2), argv[i + 1]);
    }
  }
  return flat;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

export function resolvePocEsConnection(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
): PocEsConnection {
  const sources: string[] = [];

  // Layer 3: config files (in order; later files win).
  const merged: FlatConfig = new Map();
  for (const candidate of getConfigFileCandidates(argv, env)) {
    if (!existsSync(candidate)) continue;
    const flat = readConfigFile(candidate);
    if (!flat) continue;
    let used = false;
    for (const [key, value] of flat) {
      if (key.startsWith('elasticsearch.')) {
        merged.set(key, value);
        used = true;
      }
    }
    if (used) sources.push(`config:${candidate}`);
  }

  // Layer 2: argv longopts.
  const argvOverrides = getArgvOverrides(argv);
  if (argvOverrides.size > 0) {
    for (const [key, value] of argvOverrides) merged.set(key, value);
    sources.push('argv');
  }

  const get = (key: string) => merged.get(key);

  let node = firstString(get('elasticsearch.hosts'));
  let username = firstString(get('elasticsearch.username'));
  let password = firstString(get('elasticsearch.password'));
  let serviceAccountToken = firstString(get('elasticsearch.serviceAccountToken'));
  const caPaths = asStringArray(get('elasticsearch.ssl.certificateAuthorities'));
  const verificationMode = firstString(get('elasticsearch.ssl.verificationMode'));

  // Layer 1: env vars win.
  if (env.TM_POC_ES_NODE) {
    node = env.TM_POC_ES_NODE;
    sources.push('env:TM_POC_ES_NODE');
  }
  if (env.TM_POC_ES_USER || env.TM_POC_ES_PASS) {
    username = env.TM_POC_ES_USER ?? username;
    password = env.TM_POC_ES_PASS ?? password;
    serviceAccountToken = undefined;
    sources.push('env:TM_POC_ES_USER');
  }
  if (env.TM_POC_ES_SERVICE_TOKEN) {
    serviceAccountToken = env.TM_POC_ES_SERVICE_TOKEN;
    sources.push('env:TM_POC_ES_SERVICE_TOKEN');
  }

  // Last-resort local-dev defaults.
  if (!node) {
    node = 'http://localhost:9200';
    sources.push('default:node');
  }
  if (!serviceAccountToken && !username) {
    username = 'kibana_system';
    password = 'changeme';
    sources.push('default:basic-auth');
  }

  return {
    node,
    username,
    password,
    serviceAccountToken,
    caPaths,
    rejectUnauthorized: verificationMode !== 'none',
    sources,
  };
}

/** Human-readable, secret-free summary for logging. */
export function describePocEsConnection(connection: PocEsConnection): string {
  const auth = connection.serviceAccountToken
    ? 'serviceAccountToken([REDACTED])'
    : connection.username
    ? `basic(${connection.username}/[REDACTED])`
    : 'none';
  return `node=${connection.node}, auth=${auth}, ca=${connection.caPaths.length} file(s), rejectUnauthorized=${connection.rejectUnauthorized}, sources=[${connection.sources.join(
    ', '
  )}]`;
}
