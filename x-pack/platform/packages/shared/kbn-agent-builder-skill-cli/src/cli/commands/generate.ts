/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import type { Command } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { DOMAIN_PLUGIN_PATHS, DOMAIN_BASE_PATHS } from '../../constants';
import type { SkillDomain } from '../../constants';
import { validateSkillName, validateDomain, toSnakeCase, resolveRepoRoot, writeFileIfNotExists } from '../../utils';
import { renderSkillFile } from '../../templates/skill';
import { renderToolFile } from '../../templates/tool';
import { renderSkillTestFile, renderToolTestFile } from '../../templates/test';

export const generateCmd: Command<void> = {
  name: 'generate',
  description: `
  Scaffold a new Agent Builder skill with tool files, tests, and registration.

  Examples:
    node scripts/agent_builder_skill generate --name alert-triage --domain security
    node scripts/agent_builder_skill generate --name log-analysis --domain observability --base-path skills/observability
    node scripts/agent_builder_skill generate --name alert-triage --domain security --with-tool
  `,
  flags: {
    string: ['name', 'domain', 'base-path', 'description'],
    boolean: ['with-tool'],
    default: {
      'with-tool': false,
      description: 'TODO: Add a description for this skill',
    },
    help: `
      --name           Skill name (lowercase, hyphens, max 64 chars) [required]
      --domain         Skill domain: security, observability, platform, search [required]
      --base-path      Override the default base path (e.g. skills/security/alerts)
      --description    Skill description (max 1024 chars)
      --with-tool      Also generate a companion tool file and test
    `,
  },
  run: async ({ log, flagsReader }) => {
    const name = flagsReader.string('name');
    const domain = flagsReader.string('domain');

    if (!name) {
      throw createFlagError('--name is required');
    }
    if (!domain) {
      throw createFlagError('--domain is required');
    }

    validateSkillName(name);
    validateDomain(domain);

    const repoRoot = resolveRepoRoot();
    const pluginPath = DOMAIN_PLUGIN_PATHS[domain as SkillDomain];
    const basePath = flagsReader.string('base-path') || DOMAIN_BASE_PATHS[domain as SkillDomain];
    const description = flagsReader.string('description') || 'TODO: Add a description for this skill';
    const withTool = flagsReader.boolean('with-tool');

    const skillsDir = Path.join(repoRoot, pluginPath, 'skills');
    const snakeName = toSnakeCase(name);

    log.info(`Generating skill "${name}" in domain "${domain}"...`);
    log.info(`  Plugin path: ${pluginPath}`);
    log.info(`  Base path: ${basePath}`);

    const skillFile = Path.join(skillsDir, `${snakeName}_skill.ts`);
    const skillTestFile = Path.join(skillsDir, `${snakeName}_skill.test.ts`);

    writeFileIfNotExists(
      skillFile,
      renderSkillFile({ name, domain: domain as SkillDomain, basePath, description }),
      log
    );
    writeFileIfNotExists(skillTestFile, renderSkillTestFile({ name }), log);

    if (withTool) {
      const toolsDir = Path.join(repoRoot, pluginPath, 'tools');
      const toolId = `${domain}.${name.replace(/-/g, '_')}`;
      const toolFile = Path.join(toolsDir, `${snakeName}_tool.ts`);
      const toolTestFile = Path.join(toolsDir, `${snakeName}_tool.test.ts`);

      writeFileIfNotExists(
        toolFile,
        renderToolFile({ name, domain: domain as SkillDomain, toolId, description }),
        log
      );
      writeFileIfNotExists(toolTestFile, renderToolTestFile({ name, toolId }), log);
    }

    log.info('');
    log.info('Next steps:');
    log.info(`  1. Edit ${skillFile} to add skill content and instructions`);
    if (withTool) {
      log.info(`  2. Implement the tool handler in the generated tool file`);
      log.info(`  3. Register the skill in the plugin's register_skills.ts`);
    } else {
      log.info(`  2. Register the skill in the plugin's register_skills.ts`);
    }
    log.info(`  Run: node scripts/agent_builder_skill validate --name ${name} --domain ${domain}`);
  },
};
