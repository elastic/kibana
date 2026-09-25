/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import inquirer from 'inquirer';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { FlagOptions, FlagsReader } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { resolveEvalSuites, type EvalSuiteDefinition } from './suites';
import {
  promptForSuite,
  promptForConnector,
  promptForProject,
  isTTY,
  getAllAvailableConnectors,
} from './prompts';
import {
  isDevVaultProfile,
  resolveVaultConfigPath,
  defaultExportProfile,
  envFromDatasetsProfile,
  envFromExportProfile,
  loadVaultConfig,
  stripTrailingSlash,
  probeHttp,
  isExportProfileImplicitLocal,
} from './profiles';
import { runScoutHook } from './scout_hook';
import { getEisCacheStatus, readCachedEisConnectors } from './eis_connectors_cache';
import { parseSpaceIds } from '../utils/space_ids';
import {
  runConfigInit,
  runConnectorSetup,
  ensureVaultAuth,
  ensureLocalConfig,
} from './commands/init';

const shellQuote = (value: string): string => {
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  const escaped = value.replace(/(["\\$`])/g, '\\$1');
  return `"${escaped}"`;
};

export const formatEvalCliCommand = (args: string[]): string =>
  ['node', 'scripts/evals', ...args.map((a) => (a.includes(' ') ? shellQuote(a) : a))].join(' ');

const ensureSuite = (suiteId: string, repoRoot: string, log: ToolingLog) => {
  const suites = resolveEvalSuites(repoRoot, log);
  const match = suites.find((suite) => suite.id === suiteId);
  if (match) return match;

  log.info(`Suite "${suiteId}" not found in metadata; refreshing discovery...`);
  const refreshed = resolveEvalSuites(repoRoot, log, { refresh: true });
  const refreshedMatch = refreshed.find((suite) => suite.id === suiteId);
  if (refreshedMatch) return refreshedMatch;

  const available = refreshed.map((suite) => suite.id).join(', ');
  throw createFlagError(
    `Unknown suite "${suiteId}". Available suites: ${available || 'none found'}`
  );
};

export const ensureEvalInit = async (
  repoRoot: string,
  log: ToolingLog,
  flagsReader: FlagsReader
): Promise<string | undefined> => {
  let profile = flagsReader.string('profile') ?? undefined;

  if (!flagsReader.boolean('skip-init')) {
    if (!profile) {
      if (!isTTY()) {
        throw createFlagError(
          '--profile is required in non-interactive mode (e.g. --profile dev-vault, --profile local).'
        );
      }

      type InfraChoice = 'local' | 'golden-cluster' | 'custom';
      const { choice } = await inquirer.prompt<{ choice: InfraChoice }>({
        type: 'list',
        name: 'choice',
        message: 'How do you want to run evals and export results and traces?',
        choices: [
          { name: 'Local (localhost ES/Kibana)', value: 'local' },
          {
            name: 'Golden cluster (uses Vault -- no config file needed)',
            value: 'golden-cluster',
          },
          { name: 'Custom (create a config file with your own URLs)', value: 'custom' },
        ],
      });

      if (choice === 'local') {
        await ensureLocalConfig(repoRoot, log);
        profile = 'local';
      } else if (choice === 'golden-cluster') {
        await ensureVaultAuth(log);
        profile = 'dev-vault';
      } else {
        const { customProfile } = await inquirer.prompt<{ customProfile: string }>({
          type: 'input',
          name: 'customProfile',
          message: 'Config profile name (creates config.<name>.json, or empty for config.json):',
          default: '',
        });
        const resolvedProfile = customProfile.trim() || 'default';
        await runConfigInit(repoRoot, log, { profile: resolvedProfile });
        profile = resolvedProfile;
      }
    } else if (isDevVaultProfile(profile)) {
      await ensureVaultAuth(log);
    } else if (profile === 'local') {
      await ensureLocalConfig(repoRoot, log);
    } else {
      const vaultConfigPath = resolveVaultConfigPath(repoRoot, profile);
      if (!Fs.existsSync(vaultConfigPath)) {
        if (!isTTY()) {
          throw createFlagError(
            `Config not found: ${vaultConfigPath}. Run \`node scripts/evals init config --profile ${profile}\` to create it.`
          );
        }
        log.info(`Config file for profile "${profile}" not found. Running setup wizard...`);
        log.info('');
        await runConfigInit(repoRoot, log, { profile });
      }
    }

    const evaluationConnectorId =
      flagsReader.string('evaluation-connector-id') ?? process.env.EVAL_CONNECTOR_ID;
    const explicitEisConnector = evaluationConnectorId?.startsWith('eis-') ?? false;

    // The cache guard (resolveEvalRunContext / ensureEisConnectorCache) is the
    // better diagnostic for an explicit eis-* judge: it reports exactly which
    // connector is unresolvable and how to repair the cache. The generic
    // "no connectors available" rejection would throw first and hide it.
    if (!explicitEisConnector && getAllAvailableConnectors(repoRoot).length === 0) {
      if (!isTTY()) {
        throw createFlagError(
          'No connectors available. Set KIBANA_TESTING_INFERENCE_ENDPOINTS, or run with a TTY to use the setup wizard.'
        );
      }
    }

    if (isTTY()) {
      await runConnectorSetup(repoRoot, log);
    }
  }

  return profile;
};

export interface EvalSuiteResolution {
  suite?: EvalSuiteDefinition;
  suiteId?: string;
  configPath?: string;
  resolvedConfigPath: string;
}

export const resolveEvalSuite = async (
  repoRoot: string,
  log: ToolingLog,
  flagsReader: FlagsReader
): Promise<EvalSuiteResolution> => {
  let suiteId = flagsReader.string('suite');
  const configPath = flagsReader.string('config');

  if (!suiteId && !configPath) {
    if (isTTY()) {
      const selected = await promptForSuite(repoRoot, log);
      suiteId = selected.id;
    } else {
      throw createFlagError('Missing --suite (or provide --config).');
    }
  }

  if (suiteId && configPath) {
    throw createFlagError('Use either --suite or --config, not both.');
  }

  const suite = suiteId ? ensureSuite(suiteId, repoRoot, log) : undefined;
  const resolvedConfigPath = suite
    ? suite.absoluteConfigPath
    : Path.resolve(repoRoot, configPath as string);

  return {
    suite,
    suiteId,
    configPath,
    resolvedConfigPath,
  };
};

/**
 * The spaces to run in, as `--space-ids` gave them. Validated here so a run
 * that names an impossible space stops before booting a stack for it.
 */
export const readSpaceIdsFlag = (flagsReader: FlagsReader): string[] | undefined => {
  try {
    return parseSpaceIds(flagsReader.string('space-ids'));
  } catch (error) {
    throw createFlagError(error instanceof Error ? error.message : String(error));
  }
};

export interface ResolvedProfileEnv {
  datasetsProfile?: string;
  exportProfile?: string;
  profileEnvOverrides: Record<string, string>;
  /** Output of the suite's `scoutHook`, for both Scout and the Playwright run. */
  suiteScoutEnv: Record<string, string>;
}

export interface ResolveProfileEnvOverridesOptions {
  repoRoot: string;
  log: ToolingLog;
  flagsReader: FlagsReader;
  profile?: string;
  suite?: EvalSuiteDefinition;
}

/**
 * The config a `scoutHook` reads: the datasets profile only. Suite secrets are credentials, like
 * `evaluationsKbn`, so an auto-selected export profile (e.g. `config.local.json`) must not replace them.
 */
const loadScoutHookConfig = (repoRoot: string, datasetsProfile: string | undefined): object =>
  loadVaultConfig(repoRoot, datasetsProfile) ?? {};

export const resolveProfileEnvOverrides = async ({
  repoRoot,
  log,
  flagsReader,
  profile,
  suite,
}: ResolveProfileEnvOverridesOptions): Promise<ResolvedProfileEnv> => {
  const datasetsProfile = flagsReader.string('datasets-profile') ?? profile;
  const exportProfile =
    flagsReader.string('export-profile') ?? profile ?? defaultExportProfile(repoRoot);

  const profileEnvOverrides: Record<string, string> = {
    ...envFromDatasetsProfile(repoRoot, datasetsProfile),
    ...envFromExportProfile(repoRoot, exportProfile, {
      defaultTracingExporters: exportProfile === 'local',
    }),
  };

  if (!profile && isExportProfileImplicitLocal(flagsReader, exportProfile)) {
    const tracingEsUrl = profileEnvOverrides.TRACING_ES_URL;

    const tracingReachable = tracingEsUrl
      ? await probeHttp(stripTrailingSlash(tracingEsUrl))
      : true;

    if (!tracingReachable) {
      log.warning(
        `Export profile "local" was auto-selected but TRACING_ES_URL is not reachable (${tracingEsUrl}). ` +
          'Continuing without external trace queries. To require export, pass --export-profile local.'
      );
      delete profileEnvOverrides.TRACING_ES_URL;
      delete profileEnvOverrides.TRACING_ES_API_KEY;
    }
  }

  const suiteScoutEnv = suite?.scoutHook
    ? runScoutHook(repoRoot, suite.scoutHook, loadScoutHookConfig(repoRoot, datasetsProfile))
    : {};

  return { datasetsProfile, exportProfile, profileEnvOverrides, suiteScoutEnv };
};

export const resolveEvaluationConnectorId = async (
  repoRoot: string,
  log: ToolingLog,
  flagsReader: FlagsReader
): Promise<string> => {
  const evaluationConnectorId =
    flagsReader.string('evaluation-connector-id') ?? process.env.EVAL_CONNECTOR_ID;

  if (evaluationConnectorId) {
    return evaluationConnectorId;
  }

  if (isTTY()) {
    return promptForConnector(repoRoot, log);
  }

  throw createFlagError('EVAL_CONNECTOR_ID is required. Set --evaluation-connector-id or env.');
};

const isEisConnectorId = (id: string): boolean => id.startsWith('eis-');

/**
 * Connector ids defined by a `KIBANA_TESTING_INFERENCE_ENDPOINTS` payload, or
 * `undefined` when the payload is not parseable as a JSON object — in that case
 * `loadInferenceEndpoints()`'s own error is the more useful message.
 */
const endpointIdsFromEnvVar = (raw: string): Set<string> | undefined => {
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    } catch {
      parsed = JSON.parse(raw);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return undefined;
    }
    return new Set(Object.keys(parsed as Record<string, unknown>));
  } catch {
    return undefined;
  }
};

/**
 * EIS connector IDs the run will actually resolve.
 *
 * The guard below exports the cached connector map as
 * `KIBANA_TESTING_INFERENCE_ENDPOINTS`, so a cache that is present and fresh
 * but does not define one of these IDs still produces a 404 for every call
 * that resolves it — the very failure the cache is meant to prevent. Collect
 * the ids up front so presence can be checked against the cache keys.
 */
export const requiredEisConnectorIds = (
  evaluationConnectorId: string,
  projects: string[],
  repoRoot: string
): string[] => {
  const ids = new Set<string>();

  if (isEisConnectorId(evaluationConnectorId)) {
    ids.add(evaluationConnectorId);
  }

  if (projects.length > 0) {
    for (const project of projects) {
      if (isEisConnectorId(project)) {
        ids.add(project);
      }
    }
  } else {
    // No explicit --model: the run walks every available connector, so every
    // EIS-backed one of them has to be resolvable from the cache.
    for (const connector of getAllAvailableConnectors(repoRoot)) {
      if (isEisConnectorId(connector.id)) {
        ids.add(connector.id);
      }
    }
  }

  return [...ids];
};

export interface EnsureEisConnectorCacheOptions {
  log: ToolingLog;
  /** Every EIS connector ID this run will resolve. */
  required: string[];
  /**
   * A dry run only previews the invocation (no server, no Playwright), so an
   * unusable EIS cache is reported as a warning instead of aborting the preview.
   */
  dryRun?: boolean;
}

/**
 * Fail fast when the EIS connector map this run will use cannot resolve every
 * `eis-*` ID in `required`. Shared by `start` and `run` so both entry points
 * behave the same. On success a fresh, complete cache is exported as
 * `KIBANA_TESTING_INFERENCE_ENDPOINTS` for the Playwright child process.
 */
export const ensureEisConnectorCache = ({
  log,
  required,
  dryRun = false,
}: EnsureEisConnectorCacheOptions): void => {
  // A cache or payload that covers only *some* of the EIS connector IDs this
  // run resolves still 404s every call for a missing id, so validate the map
  // that will actually be exported — not just that one exists.
  const envEndpoints = process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;

  if (envEndpoints) {
    // The payload can come from the user's shell, or from `ensureEvalInit`
    // exporting the cache earlier in this same command (interactive `start`).
    // The cache-exported case used to bypass this check entirely.
    const available = endpointIdsFromEnvVar(envEndpoints);
    const missing = available ? required.filter((id) => !available.has(id)) : [];

    if (missing.length > 0) {
      const message =
        `KIBANA_TESTING_INFERENCE_ENDPOINTS does not define ${missing.join(
          ', '
        )}, which this run ` +
        `resolves, so every inference call for those connectors will 404. Add them to the payload, or ` +
        `unset it and run \`node scripts/evals init --refresh\` to re-discover and rewrite the cache.`;
      if (dryRun) {
        log.warning(`${message} Continuing because this is a dry run.`);
      } else {
        throw createFlagError(message);
      }
    }
  } else {
    const cached = readCachedEisConnectors();
    const missing = cached ? required.filter((id) => !(id in cached)) : required;

    if (cached && missing.length === 0) {
      process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS = Buffer.from(JSON.stringify(cached)).toString(
        'base64'
      );
      log.info('EIS connectors loaded from cache (~/.elastic/eis-connectors-cache.json)');
    } else {
      const status = getEisCacheStatus();
      // `cached` is present but incomplete: neither "missing" nor "malformed"
      // describes it, so name the actual problem instead of falling through to
      // the malformed branch.
      const cacheState = cached
        ? 'is fresh but does not define every connector this run needs'
        : status === 'missing'
        ? 'is missing'
        : status === 'expired'
        ? 'is expired (>7 days old)'
        : 'is malformed';
      const missingDetail = cached && missing.length > 0 ? ` Missing: ${missing.join(', ')}.` : '';
      const message =
        `This eval requires EIS connectors, but KIBANA_TESTING_INFERENCE_ENDPOINTS is not set and ` +
        `the EIS connectors cache at ~/.elastic/eis-connectors-cache.json ${cacheState}.${missingDetail} ` +
        `Without it, eis-* connector IDs cannot be resolved and every inference call will 404. ` +
        `Run \`node scripts/evals init --refresh\` to re-discover the connectors and rewrite the cache, ` +
        `or set KIBANA_TESTING_INFERENCE_ENDPOINTS explicitly.`;

      // A dry run only previews the invocation: it starts no server and runs no
      // Playwright, so an unusable cache must not block it.
      if (dryRun) {
        log.warning(`${message} Continuing because this is a dry run.`);
      } else {
        throw createFlagError(message);
      }
    }
  }
};

/**
 * True when the run can resolve at least one `eis-*` connector ID, so the cache
 * guard has to run. With no explicit models the run walks every available
 * connector, so any EIS-backed one counts.
 */
export const requiresEisConnectorCache = (
  evaluationConnectorId: string,
  projects: string[],
  repoRoot: string
): boolean =>
  isEisConnectorId(evaluationConnectorId) ||
  (projects.length > 0
    ? projects.some(isEisConnectorId)
    : getAllAvailableConnectors(repoRoot).some((c) => isEisConnectorId(c.id)));

export interface EvalRunContext {
  evaluationConnectorId: string;
  projects: string[];
  profileEnvOverrides: Record<string, string>;
  suiteScoutEnv: Record<string, string>;
  datasetsProfile?: string;
  exportProfile?: string;
  requiresEisCcm: boolean;
}

export interface ResolveEvalRunContextOptions {
  repoRoot: string;
  log: ToolingLog;
  flagsReader: FlagsReader;
  profile?: string;
  /**
   * `start --dry-run` only previews the invocation (no server, no Playwright), so
   * an unusable EIS cache is reported as a warning instead of aborting the preview.
   */
  dryRun?: boolean;
  suite?: EvalSuiteDefinition;
}

export const resolveEvalRunContext = async ({
  repoRoot,
  log,
  flagsReader,
  profile,
  dryRun = false,
  suite,
}: ResolveEvalRunContextOptions): Promise<EvalRunContext> => {
  const evaluationConnectorId = await resolveEvaluationConnectorId(repoRoot, log, flagsReader);

  let projects: string[] = [];
  const projectFlag = flagsReader.string('project');

  if (projectFlag) {
    projects = projectFlag.split(',').map((p) => p.trim());
  } else {
    const allConnectors = getAllAvailableConnectors(repoRoot);
    if (allConnectors.length > 1 && isTTY()) {
      projects = await promptForProject(repoRoot, log);
    }
  }

  const requiresEisCcm = requiresEisConnectorCache(evaluationConnectorId, projects, repoRoot);

  if (requiresEisCcm) {
    ensureEisConnectorCache({
      log,
      required: requiredEisConnectorIds(evaluationConnectorId, projects, repoRoot),
      dryRun,
    });
  }

  const { datasetsProfile, exportProfile, profileEnvOverrides, suiteScoutEnv } =
    await resolveProfileEnvOverrides({
      repoRoot,
      log,
      flagsReader,
      profile,
      suite,
    });

  return {
    evaluationConnectorId,
    projects,
    profileEnvOverrides,
    suiteScoutEnv,
    datasetsProfile,
    exportProfile,
    requiresEisCcm,
  };
};

export const buildEvalRunEnv = ({
  evaluationConnectorId,
  requiresEisCcm,
  skipServer,
  suite,
  profileEnvOverrides,
  suiteScoutEnv,
  flagsReader,
  log,
}: {
  evaluationConnectorId: string;
  requiresEisCcm: boolean;
  skipServer: boolean;
  suite?: EvalSuiteDefinition;
  profileEnvOverrides: Record<string, string>;
  suiteScoutEnv: Record<string, string>;
  flagsReader: FlagsReader;
  log: ToolingLog;
}): Record<string, string> => {
  const envOverrides: Record<string, string> = {
    EVAL_CONNECTOR_ID: evaluationConnectorId,
  };

  if (requiresEisCcm && !skipServer) {
    envOverrides.KBN_EVALS_AWAIT_CCM_CONNECTORS = '1';
  }

  if (suite) {
    envOverrides.EVAL_SUITE_ID = suite.id;
  }

  Object.assign(envOverrides, profileEnvOverrides, suiteScoutEnv);

  if (envOverrides.TRACING_ES_URL) {
    log.info(`Trace evaluators will query: ${envOverrides.TRACING_ES_URL}`);
  }

  const repetitions = flagsReader.string('repetitions');
  if (repetitions) {
    envOverrides.EVAL_REPETITIONS = repetitions;
  }

  const spaceIds = readSpaceIdsFlag(flagsReader);
  if (spaceIds) {
    envOverrides.EVAL_SPACE_IDS = spaceIds.join(',');
  }

  const evaluationsKbnUrl = flagsReader.string('evaluations-kbn-url');
  if (evaluationsKbnUrl) {
    envOverrides.EVAL_KBN_URL = evaluationsKbnUrl;
  }

  const evaluationsKbnApiKey = flagsReader.string('evaluations-kbn-api-key');
  if (evaluationsKbnApiKey) {
    envOverrides.EVAL_KBN_API_KEY = evaluationsKbnApiKey;
  }

  return envOverrides;
};

export interface BuildEvalRunArgsOptions {
  suiteId?: string;
  configPath?: string;
  evaluationConnectorId: string;
  projects: string[];
  profile?: string;
  flagsReader: FlagsReader;
  skipServer?: boolean;
}

export const buildEvalRunArgs = ({
  suiteId,
  configPath,
  evaluationConnectorId,
  projects,
  profile,
  flagsReader,
  skipServer,
}: BuildEvalRunArgsOptions): string[] => {
  const runArgs: string[] = [];
  if (suiteId) {
    runArgs.push('--suite', suiteId);
  } else if (configPath) {
    runArgs.push('--config', configPath);
  }

  runArgs.push('--judge', evaluationConnectorId);

  if (projects.length > 0) {
    runArgs.push('--model', projects.join(','));
  }

  if (profile) {
    runArgs.push('--profile', profile);
  }
  const passedDatasetsProfile = flagsReader.string('datasets-profile');
  const passedExportProfile = flagsReader.string('export-profile');
  if (passedDatasetsProfile) {
    runArgs.push('--datasets-profile', passedDatasetsProfile);
  }
  if (passedExportProfile) {
    runArgs.push('--export-profile', passedExportProfile);
  }

  const grep = flagsReader.string('grep');
  if (grep) {
    runArgs.push('--grep', grep);
  }

  const repetitions = flagsReader.string('repetitions');
  if (repetitions) {
    runArgs.push('--repetitions', repetitions);
  }

  const spaceIds = readSpaceIdsFlag(flagsReader);
  if (spaceIds) {
    runArgs.push('--space-ids', spaceIds.join(','));
  }

  if (skipServer) {
    runArgs.push('--skip-server');
  }

  return runArgs;
};

export const evalRunFlags: FlagOptions = {
  string: [
    'suite',
    'config',
    'evaluation-connector-id',
    'project',
    'repetitions',
    'space-ids',
    'grep',
    'profile',
    'datasets-profile',
    'export-profile',
    'evaluations-kbn-url',
    'evaluations-kbn-api-key',
  ],
  boolean: ['skip-server', 'dry-run', 'skip-init'],
  alias: { model: 'project', judge: 'evaluation-connector-id' },
  default: { 'skip-server': false, 'dry-run': false, 'skip-init': false },
};
