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
  DEFAULT_KIBANA_VERSION,
  DEFAULT_TEMPLATE_USAGE_PERCENT,
  normalizeSpace,
  parseList,
  parseNonNegativeInteger,
  parsePercent,
  parseTemplateFieldTypes,
} from './utils';

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

// Asks for a percentage in [0, 100] and re-prompts on bad input. Used by the
// templates step to gather --templateUsagePercent.
async function promptPercent(
  rl: readline.Interface,
  question: string,
  fallback: number
): Promise<number> {
  while (true) {
    const value = await prompt(rl, question, String(fallback));
    const parsed = parsePercent(value, -1);
    if (parsed >= 0) return parsed;
    logger.warning('Please enter a number between 0 and 100.');
  }
}

// Asks for a multi-space name pattern and re-prompts until the answer
// contains the literal `{i}` placeholder that validateSpaces expects.
// Catches the most common wizard mistake (typing "analytics" instead of
// "analytics-{i}") in-place instead of letting it fail later in
// validateConfig.
async function promptSpaceNamePattern(rl: readline.Interface, fallback: string): Promise<string> {
  while (true) {
    const value = await prompt(rl, 'Space name pattern ({i} = index)', fallback);
    if (value.includes('{i}')) return value;
    logger.warning(
      `Pattern "${value}" is missing the {i} placeholder — try something like "${value}-{i}".`
    );
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
  if (config.kibanaVersion !== DEFAULT_KIBANA_VERSION) push('kibanaVersion', config.kibanaVersion);
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
    if (fieldTypesAllOf && fieldTypesAllOf.length > 0) {
      push('templateFieldTypes', fieldTypesAllOf.join(','));
    }
    if (config.templateUsagePercent !== DEFAULT_TEMPLATE_USAGE_PERCENT) {
      parts.push(`  --templateUsagePercent ${config.templateUsagePercent}`);
    }
  }
  if (config.legacyTemplates) parts.push('  --legacyTemplates');
  if (config.legacyCustomFields) parts.push('  --legacyCustomFields');
  if (config.concurrency) parts.push(`  --concurrency ${config.concurrency}`);
  if (config.seed) push('seed', config.seed);
  if (config.dryRun) parts.push('  --dryRun');
  if (config.cleanup) parts.push('  --cleanup');
  if (config.cleanupTag !== AUTO_GENERATED_TAG) push('cleanupTag', config.cleanupTag);
  if (config.cleanupSpaces && config.cleanupSpaces.length > 0) {
    push('cleanupSpaces', config.cleanupSpaces.join(','));
  }
  return parts.join(' \\\n');
}

interface TemplateStepResult {
  templates: TemplateInput[];
  templateOwners: string[];
  templateUsagePercent: number;
  legacyTemplates: boolean;
  legacyCustomFields: boolean;
}

// Walks the user through defining up to 10 templates (name, description,
// tags, field types) plus the template owners, usage percent, and legacy
// flags. Returns empty templates if the user opts out, but still asks about
// --legacyCustomFields because that flag is independent of whether templates
// are configured. Called by interactiveMode in step 5/6.
async function collectTemplateInputs(
  rl: readline.Interface,
  owners: string[]
): Promise<TemplateStepResult> {
  const templates: TemplateInput[] = [];
  let templateOwners: string[] = [];
  let templateUsagePercent = DEFAULT_TEMPLATE_USAGE_PERCENT;
  let legacyTemplates = false;

  const shouldCreateTemplates = await promptBoolean(rl, 'Create templates?', false);
  if (shouldCreateTemplates) {
    const templateOwnersStr = await prompt(
      rl,
      'Template owner(s) (comma-separated: securitySolution, observability, cases)',
      owners.join(',')
    );
    templateOwners = parseList(templateOwnersStr);

    while (templates.length < 10) {
      const templateNum = templates.length + 1;
      const name = await prompt(rl, `Template ${templateNum} name`, `Template ${templateNum}`);
      const description = await prompt(rl, 'Description (optional)', '');
      const tags = parseList(await prompt(rl, 'Tags (comma-separated, optional)', ''));

      const fieldTypesStr = await prompt(
        rl,
        `Field controls in declaration order, comma-separated. Valid: ${TEMPLATE_FIELD_USER_TYPES.join(
          ', '
        )} (blank = rich kitchen-sink template with display rules, validation, and compound conditions)`,
        ''
      );
      const explicit = parseTemplateFieldTypes(fieldTypesStr);
      const useKitchenSink = explicit.length === 0;

      templates.push({
        name,
        ...(description ? { description } : {}),
        ...(tags.length > 0 ? { tags } : {}),
        fieldTypes: useKitchenSink ? [] : explicit,
        useKitchenSink,
      });

      const addAnother = await promptBoolean(rl, 'Add another template?', false);
      if (!addAnother) break;
    }

    templateUsagePercent = await promptPercent(
      rl,
      'Percentage of generated cases (0-100) that should use one of the templates',
      DEFAULT_TEMPLATE_USAGE_PERCENT
    );

    legacyTemplates = await promptBoolean(
      rl,
      'Register legacy templates on the cases-configure SO too (visible in the UI as "Create from template")?',
      false
    );
  }

  const legacyCustomFields = await promptBoolean(
    rl,
    'Register typed (text/toggle/number) customFields on the cases-configure SO and have every case set values for them?',
    false
  );

  return {
    templates,
    templateOwners,
    templateUsagePercent,
    legacyTemplates,
    legacyCustomFields,
  };
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
    let cleanupSpaces: string[] | null = null;
    if (cleanup) {
      const cleanupSpacesStr = await prompt(
        rl,
        'Cleanup target spaces (comma-separated; blank = every space)',
        ''
      );
      cleanupSpaces = cleanupSpacesStr.trim() ? parseList(cleanupSpacesStr) : null;
    }

    printSection('2/6 Spaces');
    const singleSpace = normalizeSpace(
      await prompt(rl, 'Single space ID (empty or "default" for default space)', '')
    );
    const createMultipleSpaces = await promptBoolean(rl, 'Create multiple spaces?', false);
    let spaces = null;
    if (createMultipleSpaces) {
      const pattern = await promptSpaceNamePattern(rl, 'analytics-{i}');
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
    const { templates, templateOwners, templateUsagePercent, legacyTemplates, legacyCustomFields } =
      await collectTemplateInputs(rl, owners);

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
      }, templateUsagePercent=${templateUsagePercent}`
    );
    for (const tpl of templates) {
      const ftLabel = tpl.useKitchenSink
        ? 'kitchen-sink YAML'
        : tpl.fieldTypes.length > 0
        ? tpl.fieldTypes.join(', ')
        : 'none';
      logger.info(`  - ${tpl.name}: fields=[${ftLabel}]`);
    }
    if (legacyTemplates || legacyCustomFields) {
      logger.info(
        `legacy: templates=${legacyTemplates ? 'on' : 'off'}, customFields=${
          legacyCustomFields ? 'on' : 'off'
        }`
      );
    }
    if (cleanup) {
      logger.info(
        `cleanupSpaces=${cleanupSpaces ? cleanupSpaces.join(', ') || 'none' : 'every space'}`
      );
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
      spaces,
      ownerDistribution,
      analyticsOwners,
      dryRun,
      seed,
      kibanaVersion,
      cleanup,
      cleanupTag,
      cleanupSpaces,
      templateUsagePercent,
      legacyTemplates,
      legacyCustomFields,
      concurrency,
    };
    // Only emit a non-empty --templateFieldTypes in the rerun command when the
    // user opted into the synthesized-fields path (i.e. supplied explicit
    // field types). Kitchen-sink templates carry no synthesized fieldTypes,
    // so emitting `--templateFieldTypes ""` would falsely opt back into the
    // synthesized path on rerun.
    const fieldTypesAllOf =
      templates.length > 0 &&
      templates.every((tpl) => !tpl.useKitchenSink) &&
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
