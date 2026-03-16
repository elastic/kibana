/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs';
import type { Command } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { ToolingLog } from '@kbn/tooling-log';
import { DOMAIN_PLUGIN_PATHS, DOMAIN_BASE_PATHS, ELASTIC_LICENSE_HEADER } from '../../constants';
import {
  validateSkillName,
  validateDomain,
  toSnakeCase,
  toCamelCase,
  resolveRepoRoot,
  writeFile,
} from '../../utils';
import { renderSkillFile } from '../../templates/skill';
import { renderToolFile } from '../../templates/tool';
import { renderSkillTestFile, renderToolTestFile } from '../../templates/test';

function renderInlineSkillFile(opts: {
  name: string;
  domain: string;
  basePath: string;
  description: string;
  withReferencedContent: boolean;
}): string {
  const varName = `${toCamelCase(opts.name)}Skill`;
  const toolId = `${opts.domain}.${opts.name.replace(/-/g, '_')}.sample`;

  const referencedContentBlock = opts.withReferencedContent
    ? `
  referencedContent: [
    {
      relativePath: './queries',
      name: 'sample_query',
      content: \`FROM logs-* METADATA _id, _index
| WHERE @timestamp >= NOW() - INTERVAL 7 DAYS
| STATS count = COUNT(*) BY host.name
| SORT count DESC
| LIMIT 50\`,
    },
  ],`
    : '';

  return `${ELASTIC_LICENSE_HEADER}

import { ToolResultType, ToolType } from '@kbn/agent-builder-common/tools';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { z } from '@kbn/zod/v4';

export const ${varName} = defineSkillType({
  id: '${opts.name}',
  name: '${opts.name}',
  basePath: '${opts.basePath}',
  description:
    '${opts.description.replace(/'/g, "\\'")}',
  content: \`# ${toTitleCase(opts.name)}

## Overview

TODO: Describe what this skill does and when the agent should use it.

## Instructions

TODO: Provide step-by-step instructions for the agent.

## Examples

TODO: Add example interactions.
\`,${referencedContentBlock}
  getRegistryTools: () => [],
  getInlineTools: () => [
    {
      id: '${toolId}',
      type: ToolType.builtin,
      description: 'TODO: Describe what this tool does',
      schema: z.object({
        query: z.string().describe('TODO: Describe input parameter'),
      }),
      handler: async (params, _context) => {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: { message: 'Not yet implemented', query: params.query },
            },
          ],
        };
      },
    },
  ],
});
`;
}

function renderBarrelFile(skillName: string): string {
  const varName = `${toCamelCase(skillName)}Skill`;
  const snakeName = toSnakeCase(skillName);

  return `${ELASTIC_LICENSE_HEADER}

export { ${varName} } from './${snakeName}_skill';
`;
}

function renderReferencedContentSkillFile(opts: {
  name: string;
  domain: string;
  basePath: string;
  description: string;
}): string {
  const varName = `${toCamelCase(opts.name)}Skill`;

  return `${ELASTIC_LICENSE_HEADER}

import { defineSkillType } from '@kbn/agent-builder-server/skills';

export const ${varName} = defineSkillType({
  id: '${opts.name}',
  name: '${opts.name}',
  basePath: '${opts.basePath}',
  description:
    '${opts.description.replace(/'/g, "\\'")}',
  content: \`# ${toTitleCase(opts.name)}

## Overview

TODO: Describe what this skill does and when the agent should use it.

## Instructions

TODO: Provide step-by-step instructions for the agent.

## Examples

TODO: Add example interactions.
\`,
  referencedContent: [
    {
      relativePath: './queries',
      name: 'sample_query',
      content: \`FROM logs-* METADATA _id, _index
| WHERE @timestamp >= NOW() - INTERVAL 7 DAYS
| STATS count = COUNT(*) BY host.name
| SORT count DESC
| LIMIT 50\`,
    },
  ],
  getRegistryTools: () => [
    // TODO: Add tool IDs from the registry that this skill needs
  ],
});
`;
}

function toTitleCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function tryAutoRegister(
  repoRoot: string,
  pluginPath: string,
  skillName: string,
  log: ToolingLog
): boolean {
  const registerFile = Path.join(repoRoot, pluginPath, 'skills', 'register_skills.ts');
  if (!Fs.existsSync(registerFile)) {
    log.warning(`register_skills.ts not found at ${registerFile} — skipping auto-register`);
    return false;
  }

  const source = Fs.readFileSync(registerFile, 'utf-8');
  const varName = `${toCamelCase(skillName)}Skill`;
  const snakeName = toSnakeCase(skillName);

  if (source.includes(varName) || source.includes(snakeName)) {
    log.info(`  Skill already referenced in register_skills.ts`);
    return false;
  }

  const importLine = `import { ${varName} } from './${snakeName}_skill';`;
  const registerLine = `  // TODO: configure dependencies for ${skillName}\n  await agentBuilder.skills.register(${varName});`;

  const lastImportIdx = source.lastIndexOf('\nimport ');
  if (lastImportIdx < 0) {
    log.warning(`  Could not find import section in register_skills.ts — skipping auto-register`);
    return false;
  }
  const insertImportAt = source.indexOf('\n', lastImportIdx + 1);

  let updated = source.slice(0, insertImportAt) + '\n' + importLine + source.slice(insertImportAt);

  const registerFnEnd = updated.lastIndexOf('};');
  if (registerFnEnd < 0) {
    log.warning(`  Could not find register function end — skipping auto-register`);
    return false;
  }

  updated =
    updated.slice(0, registerFnEnd) + '\n' + registerLine + '\n' + updated.slice(registerFnEnd);

  Fs.writeFileSync(registerFile, updated, 'utf-8');
  log.success(`  Auto-registered in register_skills.ts (review and configure dependencies)`);
  return true;
}

export const generateCmd: Command<void> = {
  name: 'generate',
  description: `
  Scaffold a new Agent Builder skill with tool files, tests, and registration.

  Examples:
    node scripts/agent_builder_skill generate --name alert-triage --domain security
    node scripts/agent_builder_skill generate --name entity-risk --domain security --nested
    node scripts/agent_builder_skill generate --name log-analysis --domain observability --with-inline-tool
    node scripts/agent_builder_skill generate --name query-builder --domain platform --with-referenced-content
    node scripts/agent_builder_skill generate --name alert-triage --domain security --auto-register
  `,
  flags: {
    string: ['name', 'domain', 'base-path', 'description'],
    boolean: [
      'with-tool',
      'with-inline-tool',
      'with-referenced-content',
      'nested',
      'auto-register',
      'force',
    ],
    default: {
      'with-tool': false,
      'with-inline-tool': false,
      'with-referenced-content': false,
      nested: false,
      'auto-register': false,
      force: false,
    },
    help: `
      --name                     Skill name (lowercase, hyphens, max 64 chars) [required]
      --domain                   Skill domain: security, observability, platform [required]
      --base-path                Override the default base path (e.g. skills/security/alerts)
      --description              Skill description (max 1024 chars)
      --with-tool                Generate a companion registry tool file and test
      --with-inline-tool         Generate skill with getInlineTools() stub
      --with-referenced-content  Generate skill with referencedContent and sample ES|QL
      --nested                   Create skill in a nested directory with barrel export
      --auto-register            Auto-add import and registration to register_skills.ts
      --force                    Overwrite existing files
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
    const pluginPath = DOMAIN_PLUGIN_PATHS[domain];
    const basePath = flagsReader.string('base-path') || DOMAIN_BASE_PATHS[domain];
    const description =
      flagsReader.string('description') || 'TODO: Add a description for this skill';
    const withTool = flagsReader.boolean('with-tool');
    const withInlineTool = flagsReader.boolean('with-inline-tool');
    const withReferencedContent = flagsReader.boolean('with-referenced-content');
    const nested = flagsReader.boolean('nested');
    const autoRegister = flagsReader.boolean('auto-register');
    const force = flagsReader.boolean('force');

    const skillsDir = Path.join(repoRoot, pluginPath, 'skills');
    const snakeName = toSnakeCase(name);

    log.info(`Generating skill "${name}" in domain "${domain}"...`);
    log.info(`  Plugin path: ${pluginPath}`);
    log.info(`  Base path: ${basePath}`);
    if (nested) log.info(`  Layout: nested directory`);
    if (withInlineTool) log.info(`  Includes: inline tool stub`);
    if (withReferencedContent) log.info(`  Includes: referencedContent with ES|QL sample`);

    let skillFile: string;
    let skillTestFile: string;

    if (nested) {
      const skillDir = Path.join(skillsDir, snakeName);
      skillFile = Path.join(skillDir, `${snakeName}_skill.ts`);
      skillTestFile = Path.join(skillDir, `${snakeName}_skill.test.ts`);

      if (withInlineTool || withReferencedContent) {
        writeFile(
          skillFile,
          withInlineTool
            ? renderInlineSkillFile({ name, domain, basePath, description, withReferencedContent })
            : renderReferencedContentSkillFile({ name, domain, basePath, description }),
          log,
          force
        );
      } else {
        writeFile(skillFile, renderSkillFile({ name, domain, basePath, description }), log, force);
      }
      writeFile(skillTestFile, renderSkillTestFile({ name }), log, force);

      const barrelFile = Path.join(skillDir, 'index.ts');
      writeFile(barrelFile, renderBarrelFile(name), log, force);
    } else {
      skillFile = Path.join(skillsDir, `${snakeName}_skill.ts`);
      skillTestFile = Path.join(skillsDir, `${snakeName}_skill.test.ts`);

      if (withInlineTool || withReferencedContent) {
        writeFile(
          skillFile,
          withInlineTool
            ? renderInlineSkillFile({ name, domain, basePath, description, withReferencedContent })
            : renderReferencedContentSkillFile({ name, domain, basePath, description }),
          log,
          force
        );
      } else {
        writeFile(skillFile, renderSkillFile({ name, domain, basePath, description }), log, force);
      }
      writeFile(skillTestFile, renderSkillTestFile({ name }), log, force);
    }

    if (withTool && !withInlineTool) {
      const toolsDir = Path.join(repoRoot, pluginPath, 'tools');
      const toolId = `${domain}.${name.replace(/-/g, '_')}`;
      const toolFile = Path.join(toolsDir, `${snakeName}_tool.ts`);
      const toolTestFile = Path.join(toolsDir, `${snakeName}_tool.test.ts`);

      writeFile(toolFile, renderToolFile({ name, domain, toolId, description }), log, force);
      writeFile(toolTestFile, renderToolTestFile({ name, toolId }), log, force);
    }

    if (autoRegister) {
      tryAutoRegister(repoRoot, pluginPath, name, log);
    }

    log.info('');
    log.info('Next steps:');
    log.info(
      `  1. Edit ${Path.relative(repoRoot, skillFile)} to add skill content and instructions`
    );
    const nextStep = withTool ? 3 : 2;
    if (withTool) {
      log.info(`  2. Implement the tool handler in the generated tool file`);
    }
    if (!autoRegister) {
      log.info(`  ${nextStep}. Register the skill in the plugin's register_skills.ts`);
    }
    log.info(`  Run: node scripts/agent_builder_skill validate --name ${name} --domain ${domain}`);
  },
};
