/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import readline from 'readline';
import { logger } from './logger';
import type { GeneratorConfig, TemplateInput } from './types';
import { TEMPLATE_FIELD_USER_TYPES } from './types';
import {
  AUTO_GENERATED_TAG,
  normalizeSpace,
  parseList,
  parseNonNegativeInteger,
  parseTemplateFieldTypes,
} from './utils';

const DEFAULT_KIBANA_VERSION = '9.2.0';

// Asks `question` on the readline interface and resolves with the user's
// trimmed answer (or `defaultVal` if they hit enter). Building block for
// every step of the interactive wizard.
function prompt(rl: readline.Interface, question: string, defaultVal?: string): Promise<string> {
  const suffix = defaultVal !== undefined ? ` [${defaultVal}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => resolve(answer.trim() || defaultVal || ''));
  });
}

// Prints a `=== Title ===` divider so the wizard's six sections are visually
// distinct in the terminal.
function printSection(title: string) {
  logger.info(`\n=== ${title} ===`);
}

// Asks a yes/no question and re-prompts on bad input. Used throughout the
// wizard for every toggle.
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
// wizard for counts (cases, comments, alerts, events, weights).
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

// Walks the user through defining up to 10 templates (name, description,
// tags, field types) plus the template owners and space. Returns empty arrays
// if the user opts out of templates. Called by interactiveMode in step 5/6.
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

// Drives the six-step wizard (connection, spaces, ownership, volume,
// templates, review) and returns the raw GeneratorConfig the user assembled.
// Validation is loadConfig's responsibility — this function focuses on
// collecting input. Called by loadConfig when --interactive (-i) is supplied.
export async function interactiveMode(): Promise<GeneratorConfig> {
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

    return previewConfig;
  } finally {
    rl.close();
  }
}
