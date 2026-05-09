/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yargs from 'yargs';
import { interactiveMode } from './interactive_wizard';
import type { GeneratorConfig, TemplateInput } from './types';
import { TEMPLATE_FIELD_USER_TYPES, VALID_OWNERS } from './types';
import {
  AUTO_GENERATED_TAG,
  dedupe,
  normalizeSpace,
  parseNonNegativeInteger,
  parseOwnerDistribution,
  parseTemplateFieldTypes,
} from './utils';

const DEFAULT_KIBANA_VERSION = '9.2.0';

// Throws when the owner list is empty or contains anything outside
// VALID_OWNERS. Called by validateConfig for both the case owners and the
// template owners (when templates are requested).
function validateOwners(owners: string[]) {
  if (owners.length === 0) {
    throw new Error(`At least one owner is required. Valid owners: ${VALID_OWNERS.join(', ')}`);
  }
  const invalidOwner = owners.find(
    (owner) => !VALID_OWNERS.includes(owner as (typeof VALID_OWNERS)[number])
  );
  if (invalidOwner) {
    throw new Error(`Invalid owner "${invalidOwner}". Valid owners: ${VALID_OWNERS.join(', ')}`);
  }
}

// Throws when the owner distribution has a negative weight or a total weight
// of zero. Called by validateConfig so weightedOwnerPick always has at least
// one positive weight to work with.
function validateOwnerDistribution(config: GeneratorConfig) {
  if (!config.ownerDistribution) return;

  let sum = 0;
  for (const owner of config.owners) {
    const weight = config.ownerDistribution[owner] ?? 0;
    if (weight < 0) {
      throw new Error(`Owner distribution cannot contain negative weights (${owner}: ${weight})`);
    }
    sum += weight;
  }

  if (sum <= 0) {
    throw new Error('Owner distribution must contain at least one positive weight');
  }
}

// Throws when the multi-space config is malformed (zero count, or a name
// pattern missing the {i} placeholder). Called by validateConfig.
function validateSpaces(config: GeneratorConfig) {
  if (!config.spaces) return;
  if (config.spaces.count <= 0) {
    throw new Error('numSpaces must be greater than zero when using multiple spaces');
  }
  if (!config.spaces.namePattern.includes('{i}')) {
    throw new Error('spaceNamePattern must include "{i}" placeholder');
  }
}

// Final gate before returning a GeneratorConfig: dedupes owner/templateOwner
// lists and runs every individual validator. Throws on the first problem so
// the user sees a clear error before the run starts. Called by loadConfig
// for both interactive and CLI modes.
function validateConfig(config: GeneratorConfig): GeneratorConfig {
  config.owners = dedupe(config.owners);
  config.templateOwners = dedupe(config.templateOwners);

  validateOwners(config.owners);
  if (config.templates.length > 0) {
    validateOwners(config.templateOwners);
  }
  validateOwnerDistribution(config);
  validateSpaces(config);

  if (typeof config.kibanaVersion !== 'string' || config.kibanaVersion.trim().length === 0) {
    throw new Error('kibanaVersion must be a non-empty string');
  }

  if (config.cleanupTag.trim().length === 0) {
    throw new Error('cleanupTag must be a non-empty string');
  }

  if (
    config.concurrency !== null &&
    (!Number.isInteger(config.concurrency) || config.concurrency <= 0)
  ) {
    throw new Error('concurrency must be a positive integer when provided');
  }

  if (!Number.isInteger(config.count) || config.count <= 0) {
    throw new Error('count must be a positive integer');
  }

  for (const [name, value] of [
    ['comments', config.comments],
    ['alerts', config.alerts],
    ['events', config.events],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${name} must be a non-negative integer`);
    }
  }

  if (config.events > 0 && config.owners.every((owner) => owner === 'observability')) {
    throw new Error('Event attachments are unsupported for observability-only generation');
  }

  if (config.seed !== null && config.seed.trim().length === 0) {
    throw new Error('seed cannot be an empty string');
  }

  return config;
}

// Parses argv via yargs and returns the raw GeneratorConfig (validation is
// the caller's job). Called by loadConfig for non-interactive runs. Adding a
// new CLI flag means adding both a yargs option here and a field on
// GeneratorConfig in types.ts.
function parseCliConfig(): GeneratorConfig {
  const argv = yargs.help().options({
    interactive: {
      alias: 'i',
      describe: 'Run in interactive mode with step-by-step prompts',
      type: 'boolean',
      default: false,
    },
    username: {
      alias: 'u',
      describe: 'Username for Kibana/ES authentication',
      type: 'string',
      default: 'elastic',
    },
    password: {
      alias: 'p',
      describe: 'Password for Kibana/ES authentication',
      type: 'string',
      default: 'changeme',
    },
    kibana: {
      alias: 'k',
      describe: 'Kibana URL',
      default: 'http://127.0.0.1:5601',
      type: 'string',
    },
    node: {
      alias: 'n',
      describe: 'Elasticsearch node URL',
      default: 'http://elastic:changeme@127.0.0.1:9200',
      type: 'string',
    },
    count: {
      alias: 'c',
      describe: 'Number of cases to generate',
      type: 'number',
      default: 10,
    },
    comments: {
      alias: 'm',
      describe: 'Number of user comments per case',
      type: 'number',
      default: 0,
    },
    alerts: {
      alias: 'a',
      describe: 'Number of alert attachments per case (indexed into ES)',
      type: 'number',
      default: 0,
    },
    events: {
      alias: 'e',
      describe: 'Number of event attachments per case (process events)',
      type: 'number',
      default: 0,
    },
    apiKey: {
      describe: 'API key for authorization (required for serverless)',
      type: 'string',
      default: '',
    },
    owners: {
      alias: 'o',
      describe: 'Case owners (securitySolution, observability, cases)',
      default: ['securitySolution', 'observability', 'cases'],
      type: 'array',
    },
    space: {
      alias: 's',
      describe: 'Kibana space ID',
      default: '',
      type: 'string',
    },
    ssl: {
      describe: 'Use HTTPS with certificate verification',
      type: 'boolean',
      default: false,
    },
    templates: {
      alias: 't',
      describe: 'Number of auto-generated templates to create per owner (max 10)',
      type: 'number',
      default: 0,
    },
    templateOwners: {
      describe: 'Owner(s) to create templates for (defaults to --owners)',
      type: 'array',
    },
    templateSpace: {
      describe: 'Space to create templates in (defaults to --space)',
      type: 'string',
    },
    templateFieldTypes: {
      describe: `Comma-separated field types for each auto-generated template, in order. Valid types: ${TEMPLATE_FIELD_USER_TYPES.join(
        ', '
      )}. Example: "integer,keyword,boolean".`,
      type: 'string',
      default: '',
    },
    numSpaces: {
      describe: 'Number of spaces to create before generating cases (uses --space-name-pattern)',
      type: 'number',
      default: 0,
    },
    spaceNamePattern: {
      describe: 'Pattern for generated space IDs — {i} is replaced with 1-based index',
      type: 'string',
      default: 'space-{i}',
    },
    ownerDistribution: {
      describe:
        'Weighted owner distribution as "owner:weight,..." e.g. "securitySolution:50,observability:30,cases:20"',
      type: 'string',
      default: '',
    },
    analyticsOwners: {
      describe:
        'Solutions that should have analytics indices enabled (comma-separated or array). Applied to every target space.',
      type: 'array',
    },
    dryRun: {
      describe: 'Show detailed execution plan without writing to Kibana or Elasticsearch',
      type: 'boolean',
      default: false,
    },
    seed: {
      describe: 'Optional deterministic seed for repeatable generation plans and owner selection',
      type: 'string',
      default: '',
    },
    kibanaVersion: {
      describe: 'Kibana version stamped into generated alert and event documents',
      type: 'string',
      default: DEFAULT_KIBANA_VERSION,
    },
    cleanup: {
      describe:
        'Delete previously generated cases and templates (matched by --cleanupTag) in the target space(s) and exit. Skips case/alert/event/template generation entirely.',
      type: 'boolean',
      default: false,
    },
    cleanupTag: {
      describe: 'Tag used to identify auto-generated cases and templates during cleanup',
      type: 'string',
      default: AUTO_GENERATED_TAG,
    },
    concurrency: {
      describe:
        'Concurrent case-create requests. Defaults adapt to whether attachments are configured (~10 with attachments, ~30 without). Bump to ~50 for large seeds.',
      type: 'number',
      default: 0,
    },
  }).argv;

  const templateCount = Math.min(Number(argv.templates) || 0, 10);
  const templateFieldTypes = parseTemplateFieldTypes(String(argv.templateFieldTypes ?? ''));
  const autoTemplates: TemplateInput[] = Array.from({ length: templateCount }, (_, i) => ({
    name: `Auto Template ${i + 1}`,
    description: `Auto-generated template ${i + 1}`,
    tags: ['auto-generated'],
    fieldTypes: templateFieldTypes,
  }));

  const owners = (argv.owners as string[]) ?? [];
  const numSpaces = Number(argv.numSpaces) || 0;
  const analyticsOwners = (argv.analyticsOwners as string[] | undefined)?.length
    ? (argv.analyticsOwners as string[])
    : null;

  return {
    kibana: argv.kibana,
    node: argv.node,
    username: argv.username,
    password: argv.password,
    ssl: argv.ssl,
    apiKey: argv.apiKey ?? '',
    space: normalizeSpace(argv.space),
    owners,
    count: parseNonNegativeInteger(String(argv.count), 10),
    comments: parseNonNegativeInteger(String(argv.comments), 0),
    alerts: parseNonNegativeInteger(String(argv.alerts), 0),
    events: parseNonNegativeInteger(String(argv.events ?? 0), 0),
    templates: autoTemplates,
    templateOwners: ((argv.templateOwners as string[] | undefined) ?? owners).map((owner) =>
      owner.trim()
    ),
    templateSpace: normalizeSpace(argv.templateSpace ?? argv.space),
    spaces: numSpaces > 0 ? { namePattern: argv.spaceNamePattern, count: numSpaces } : null,
    ownerDistribution: parseOwnerDistribution(argv.ownerDistribution ?? ''),
    analyticsOwners,
    dryRun: Boolean(argv.dryRun),
    seed: argv.seed ? String(argv.seed) : null,
    kibanaVersion: String(argv.kibanaVersion ?? DEFAULT_KIBANA_VERSION),
    cleanup: Boolean(argv.cleanup),
    cleanupTag: String(argv.cleanupTag ?? AUTO_GENERATED_TAG),
    concurrency: Number(argv.concurrency) > 0 ? Number(argv.concurrency) : null,
  };
}

// Decides between interactive wizard mode and CLI argv mode based on whether
// `-i` / `--interactive` is present, then validates the result. Sole entry
// point used by run.ts.
export async function loadConfig(): Promise<GeneratorConfig> {
  const isInteractive = process.argv.includes('--interactive') || process.argv.includes('-i');
  const raw = isInteractive ? await interactiveMode() : parseCliConfig();
  return validateConfig(raw);
}
