/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import readline from 'readline';
import yargs from 'yargs';
import { logger } from './logger';
import type { GeneratorConfig, TemplateFieldUserType, TemplateInput } from './types';
import { TEMPLATE_FIELD_USER_TYPES, VALID_OWNERS } from './types';
import {
  AUTO_GENERATED_TAG,
  dedupe,
  normalizeSpace,
  parseList,
  parseNonNegativeInteger,
  parseOwnerDistribution,
} from './utils';

const DEFAULT_KIBANA_VERSION = '9.2.0';

// Parses a comma-separated list of template field types (e.g. "text,number,date")
// into the typed array createTemplates expects, warning on unknown values.
// Used by both the CLI (--templateFieldTypes) and the interactive wizard.
function parseTemplateFieldTypes(input: string): TemplateFieldUserType[] {
  if (!input) return [];
  const valid = new Set<string>(TEMPLATE_FIELD_USER_TYPES);
  const result: TemplateFieldUserType[] = [];
  for (const raw of parseList(input)) {
    const normalized = raw.toLowerCase();
    if (valid.has(normalized)) {
      result.push(normalized as TemplateFieldUserType);
    } else {
      logger.warning(
        `Skipping unknown template field type "${raw}". Valid types: ${TEMPLATE_FIELD_USER_TYPES.join(
          ', '
        )}`
      );
    }
  }
  return result;
}

// Asks `question` on the readline interface and resolves with the user's
// trimmed answer (or `defaultVal` if they hit enter). Building block for
// every step of the interactive wizard.
function prompt(rl: readline.Interface, question: string, defaultVal?: string): Promise<string> {
  const suffix = defaultVal !== undefined ? ` [${defaultVal}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => resolve(answer.trim() || defaultVal || ''));
  });
}

// Prints a `=== Title ===` divider so the interactive wizard's six sections
// are visually distinct in the terminal.
function printSection(title: string) {
  logger.info(`\n=== ${title} ===`);
}

// Wraps `value` in single quotes when it contains shell-significant characters
// so the rerun-command preview stays copy-paste safe. Used by
// buildShorthandCommand.
function shellQuote(value: string): string {
  if (value === '' || /[\s"'$`\\!*?{}[\]<>|&;()#~]/.test(value)) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }
  return value;
}

// Renders a non-interactive `node generate_cases.js …` command equivalent to
// the interactive choices the user just made, suppressing flags that match
// defaults. Printed at the end of the wizard so the user can recreate the
// run later without going through the prompts again.
// eslint-disable-next-line complexity -- one branch per CLI flag; flat is clearer than abstracted here
function buildShorthandCommand(config: GeneratorConfig, fieldTypesAllOf?: string[]): string {
  const parts: string[] = ['node x-pack/platform/plugins/shared/cases/scripts/generate_cases.js'];
  const push = (flag: string, value: string) => parts.push(`  --${flag} ${shellQuote(value)}`);

  if (config.kibana !== 'http://127.0.0.1:5601') push('kibana', config.kibana);
  if (config.node !== 'http://elastic:changeme@127.0.0.1:9200') push('node', config.node);
  if (config.username !== 'elastic') push('username', config.username);
  if (config.password !== 'changeme') push('password', config.password);
  if (config.ssl) parts.push('  --ssl');
  if (config.apiKey) push('apiKey', config.apiKey);
  if (config.kibanaVersion !== '9.2.0') push('kibanaVersion', config.kibanaVersion);
  if (config.space) push('space', config.space);
  if (config.spaces) {
    parts.push(`  --numSpaces ${config.spaces.count}`);
    if (config.spaces.namePattern !== 'space-{i}')
      push('spaceNamePattern', config.spaces.namePattern);
  }
  if (config.owners.join(',') !== 'securitySolution,observability,cases') {
    parts.push(`  --owners ${config.owners.map(shellQuote).join(' --owners ')}`);
  }
  if (config.ownerDistribution) {
    const dist = Object.entries(config.ownerDistribution)
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    push('ownerDistribution', dist);
  }
  if (config.analyticsOwners && config.analyticsOwners.length > 0) {
    parts.push(
      `  --analyticsOwners ${config.analyticsOwners.map(shellQuote).join(' --analyticsOwners ')}`
    );
  }
  if (config.count !== 10) parts.push(`  --count ${config.count}`);
  if (config.comments > 0) parts.push(`  --comments ${config.comments}`);
  if (config.alerts > 0) parts.push(`  --alerts ${config.alerts}`);
  if (config.events > 0) parts.push(`  --events ${config.events}`);
  if (config.templates.length > 0) {
    parts.push(`  --templates ${config.templates.length}`);
    if (config.templateOwners.join(',') !== config.owners.join(',')) {
      parts.push(
        `  --templateOwners ${config.templateOwners.map(shellQuote).join(' --templateOwners ')}`
      );
    }
    if (config.templateSpace) push('templateSpace', config.templateSpace);
    if (fieldTypesAllOf && fieldTypesAllOf.length > 0) {
      push('templateFieldTypes', fieldTypesAllOf.join(','));
    }
  }
  if (config.concurrency) parts.push(`  --concurrency ${config.concurrency}`);
  if (config.seed) push('seed', config.seed);
  if (config.dryRun) parts.push('  --dryRun');
  if (config.cleanup) parts.push('  --cleanup');
  if (config.cleanupTag !== AUTO_GENERATED_TAG) push('cleanupTag', config.cleanupTag);
  return parts.join(' \\\n');
}

// Asks a yes/no question on the readline interface and re-prompts on bad
// input. Used throughout the interactive wizard for every toggle.
async function promptBoolean(
  rl: readline.Interface,
  question: string,
  defaultVal: boolean
): Promise<boolean> {
  const defaultLabel = defaultVal ? 'y' : 'n';
  while (true) {
    const value = (await prompt(rl, `${question} (y/n)`, defaultLabel)).toLowerCase();
    if (value === 'y') return true;
    if (value === 'n') return false;
    logger.warning('Please enter "y" or "n".');
  }
}

// Asks for a non-negative integer and re-prompts on bad input. Used by the
// interactive wizard for counts (cases, comments, alerts, events, weights).
async function promptNonNegativeInteger(
  rl: readline.Interface,
  question: string,
  fallback: number
): Promise<number> {
  while (true) {
    const value = await prompt(rl, question, String(fallback));
    const parsed = parseNonNegativeInteger(value, -1);
    if (parsed >= 0) return parsed;
    logger.warning('Please enter a non-negative integer.');
  }
}

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
// the user sees a clear error before the run starts. Called by both
// interactiveMode and parseCliConfig.
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

// Walks the user through defining up to 10 templates (name, description,
// tags, field types) in the interactive wizard, plus the template owners and
// space. Returns empty arrays if the user opts out of templates. Called by
// interactiveMode in step 5/6.
async function collectTemplateInputs(
  rl: readline.Interface,
  owners: string[],
  space: string
): Promise<{ templates: TemplateInput[]; templateOwners: string[]; templateSpace: string }> {
  const templates: TemplateInput[] = [];
  let templateOwners: string[] = [];
  let templateSpace = space;

  const shouldCreateTemplates = await promptBoolean(rl, 'Create templates?', false);
  if (!shouldCreateTemplates) {
    return { templates, templateOwners, templateSpace };
  }

  const templateOwnersStr = await prompt(
    rl,
    'Template owner(s) (comma-separated: securitySolution, observability, cases)',
    owners.join(',')
  );
  templateOwners = parseList(templateOwnersStr);

  templateSpace = normalizeSpace(
    await prompt(rl, 'Template space (empty or "default" for default space)', space || 'default')
  );

  while (templates.length < 10) {
    const templateNum = templates.length + 1;
    const name = await prompt(rl, `Template ${templateNum} name`, `Template ${templateNum}`);
    const description = await prompt(rl, 'Description (optional)', '');
    const tags = parseList(await prompt(rl, 'Tags (comma-separated, optional)', ''));

    const fieldTypesStr = await prompt(
      rl,
      `Field controls in declaration order, comma-separated. Valid: ${TEMPLATE_FIELD_USER_TYPES.join(
        ', '
      )} (each maps to a real {control, value type} pair — text→INPUT_TEXT/keyword, number→INPUT_NUMBER/integer, date→DATE_PICKER/date, etc.)`,
      ''
    );
    const fieldTypes = parseTemplateFieldTypes(fieldTypesStr);

    templates.push({
      name,
      ...(description ? { description } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      fieldTypes,
    });

    const addAnother = await promptBoolean(rl, 'Add another template?', false);
    if (!addAnother) break;
  }

  return { templates, templateOwners, templateSpace };
}

// Drives the six-step interactive wizard (connection, spaces, ownership,
// volume, templates, review) and returns a validated GeneratorConfig. Also
// prints an equivalent non-interactive command at the end. Called by
// loadConfig when --interactive (-i) is supplied.
async function interactiveMode(): Promise<GeneratorConfig> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    logger.info('\nCases Generator Interactive Wizard');
    logger.info('Build a generation profile in six steps.\n');

    printSection('1/6 Connection');
    const kibana = await prompt(rl, 'Kibana URL', 'http://127.0.0.1:5601');
    const node = await prompt(rl, 'Elasticsearch URL', 'http://elastic:changeme@127.0.0.1:9200');
    const username = await prompt(rl, 'Username', 'elastic');
    const password = await prompt(rl, 'Password', 'changeme');
    const ssl = await promptBoolean(rl, 'Use SSL?', false);
    const apiKey = await prompt(rl, 'API Key (leave empty for basic auth)', '');
    const kibanaVersion = await prompt(
      rl,
      'Kibana version (stamped into generated alerts/events)',
      DEFAULT_KIBANA_VERSION
    );
    const dryRun = await promptBoolean(rl, 'Run as dry-run only (no writes)?', false);
    const seedInput = await prompt(
      rl,
      'Optional deterministic seed (any non-empty string, e.g. "demo-2026" — same seed reproduces the same owner picks, severities, tags, alert/event distribution; leave blank for fresh randomness)',
      ''
    );
    const seed = seedInput.trim() ? seedInput : null;
    const concurrencyInput = await prompt(rl, 'Concurrency override (blank = auto)', '');
    const concurrency = concurrencyInput.trim() ? Number.parseInt(concurrencyInput, 10) : null;
    const cleanup = await promptBoolean(
      rl,
      'Cleanup mode? (delete previously generated cases/templates and exit)',
      false
    );
    const cleanupTag = await prompt(
      rl,
      'Cleanup tag (matches case+template tags)',
      AUTO_GENERATED_TAG
    );

    printSection('2/6 Spaces');
    const singleSpace = normalizeSpace(
      await prompt(rl, 'Single space ID (empty or "default" for default space)', '')
    );
    const createMultipleSpaces = await promptBoolean(rl, 'Create multiple spaces?', false);
    let spaces = null;
    if (createMultipleSpaces) {
      const pattern = await prompt(rl, 'Space name pattern ({i} = index)', 'analytics-{i}');
      const count = await promptNonNegativeInteger(rl, 'Number of spaces to create', 3);
      spaces = { namePattern: pattern, count };
    }

    printSection('3/6 Ownership');
    const owners = parseList(
      await prompt(
        rl,
        'Owners (comma-separated: securitySolution, observability, cases)',
        'securitySolution,observability,cases'
      )
    );

    let ownerDistribution: Record<string, number> | null = null;
    if (await promptBoolean(rl, 'Configure weighted owner distribution?', false)) {
      ownerDistribution = {};
      const defaultPct = Math.max(1, Math.floor(100 / Math.max(owners.length, 1)));
      for (const owner of owners) {
        const weight = await promptNonNegativeInteger(rl, `Weight for "${owner}"`, defaultPct);
        ownerDistribution[owner] = weight;
      }
    }

    let analyticsOwners: string[] | null = null;
    if (await promptBoolean(rl, 'Enable analytics indices for specific owners?', false)) {
      analyticsOwners = parseList(
        await prompt(rl, 'Analytics owner(s) (comma-separated)', owners.join(','))
      );
    }

    printSection('4/6 Case and attachment volume');
    const count = await promptNonNegativeInteger(rl, 'Number of cases to generate (per space)', 10);
    const comments = await promptNonNegativeInteger(rl, 'User comments per case', 0);
    const alerts = await promptNonNegativeInteger(rl, 'Alert attachments per case', 0);
    const events = await promptNonNegativeInteger(rl, 'Event attachments per case', 0);

    printSection('5/6 Templates');
    const { templates, templateOwners, templateSpace } = await collectTemplateInputs(
      rl,
      owners,
      singleSpace
    );

    printSection('6/6 Review');
    logger.info(`kibana=${kibana} (version=${kibanaVersion})`);
    logger.info(`node=${node}`);
    logger.info(`dryRun=${dryRun}`);
    logger.info(`seed=${seed ?? 'none'}`);
    logger.info(
      `spaces=${spaces ? `${spaces.count} x ${spaces.namePattern}` : singleSpace || 'default'}`
    );
    logger.info(`owners=${owners.join(', ')}`);
    logger.info(`count=${count}, comments=${comments}, alerts=${alerts}, events=${events}`);
    logger.info(
      `templates=${templates.length}, templateOwners=${
        templateOwners.join(', ') || 'none'
      }, templateSpace=${templateSpace || 'default'}`
    );
    for (const tpl of templates) {
      const ftLabel = tpl.fieldTypes.length > 0 ? tpl.fieldTypes.join(', ') : 'none';
      logger.info(`  - ${tpl.name}: fields=[${ftLabel}]`);
    }
    logger.info(`analyticsOwners=${analyticsOwners?.join(', ') ?? 'none'}`);

    const previewConfig: GeneratorConfig = {
      kibana,
      node,
      username,
      password,
      ssl,
      apiKey,
      space: singleSpace,
      owners,
      count,
      comments,
      alerts,
      events,
      templates,
      templateOwners,
      templateSpace,
      spaces,
      ownerDistribution,
      analyticsOwners,
      dryRun,
      seed,
      kibanaVersion,
      cleanup,
      cleanupTag,
      concurrency,
    };
    const fieldTypesAllOf =
      templates.length > 0 &&
      templates.every(
        (tpl) =>
          tpl.fieldTypes.length === templates[0].fieldTypes.length &&
          tpl.fieldTypes.every((ft, i) => ft === templates[0].fieldTypes[i])
      )
        ? templates[0].fieldTypes
        : undefined;
    logger.info('\nTo rerun this configuration non-interactively:');
    logger.info(buildShorthandCommand(previewConfig, fieldTypesAllOf));

    const confirmed = await promptBoolean(rl, '\nProceed with this configuration?', true);
    if (!confirmed) {
      throw new Error('Interactive run cancelled by user.');
    }

    return validateConfig({
      kibana,
      node,
      username,
      password,
      ssl,
      apiKey,
      space: singleSpace,
      owners,
      count,
      comments,
      alerts,
      events,
      templates,
      templateOwners,
      templateSpace,
      spaces,
      ownerDistribution,
      analyticsOwners,
      dryRun,
      seed,
      kibanaVersion,
      cleanup,
      cleanupTag,
      concurrency,
    });
  } finally {
    rl.close();
  }
}

// Parses argv via yargs, normalizes/validates the values, and returns a
// GeneratorConfig. Called by loadConfig for non-interactive runs. Adding a
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

  return validateConfig({
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
  });
}

// Decides between interactive wizard mode and CLI argv mode based on
// whether `-i` / `--interactive` is present. Sole entry point used by run.ts.
export async function loadConfig(): Promise<GeneratorConfig> {
  const isInteractive = process.argv.includes('--interactive') || process.argv.includes('-i');
  if (isInteractive) {
    return interactiveMode();
  }
  return parseCliConfig();
}
