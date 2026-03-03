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
import { DOMAIN_PLUGIN_PATHS } from '../../constants';
import type { SkillDomain } from '../../constants';
import { validateSkillName, validateDomain, toSnakeCase, resolveRepoRoot } from '../../utils';

function parseSkillMd(content: string): { name: string; description: string; body: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { name: '', description: '', body: content.trim() };
  }

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2].trim();

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  return {
    name: nameMatch?.[1]?.trim() ?? '',
    description: descMatch?.[1]?.trim() ?? '',
    body,
  };
}

function parseExtensionsYaml(content: string): {
  id: string;
  name: string;
  basePath: string;
  description: string;
  registryTools: string[];
} {
  const idMatch = content.match(/^id:\s*(.+)$/m);
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  const basePathMatch = content.match(/^basePath:\s*(.+)$/m);
  const descMatch = content.match(/^description:\s*>\s*\n\s*(.+)$/m);
  const toolsSection = content.match(/^registryTools:\n([\s\S]*?)(?:\n\w|$)/m);

  const tools: string[] = [];
  if (toolsSection) {
    const toolLines = toolsSection[1].match(/^\s+-\s+(.+)$/gm);
    if (toolLines) {
      for (const line of toolLines) {
        const toolMatch = line.match(/^\s+-\s+(.+)$/);
        if (toolMatch) {
          tools.push(toolMatch[1].trim());
        }
      }
    }
  }

  return {
    id: idMatch?.[1]?.trim() ?? '',
    name: nameMatch?.[1]?.trim() ?? '',
    basePath: basePathMatch?.[1]?.trim() ?? '',
    description: descMatch?.[1]?.trim() ?? '',
    registryTools: tools,
  };
}

function updateSkillFileContent(
  source: string,
  updates: { content?: string; description?: string; tools?: string[] }
): string {
  let result = source;

  if (updates.content) {
    const toolsSectionIndex = updates.content.indexOf('\n## Tools\n');
    const cleanContent =
      toolsSectionIndex >= 0
        ? updates.content.slice(0, toolsSectionIndex).trim()
        : updates.content;

    result = result.replace(
      /content:\s*`[^`]*`/s,
      `content: \`${cleanContent}\``
    );
  }

  if (updates.description) {
    result = result.replace(
      /description:\s*\n?\s*['"`][^'"`]*['"`]/s,
      `description:\n    '${updates.description.replace(/'/g, "\\'")}'`
    );
  }

  if (updates.tools && updates.tools.length > 0) {
    const toolsList = updates.tools.map((t) => `'${t}'`).join(', ');
    result = result.replace(
      /getRegistryTools:\s*\(\)\s*=>\s*\[[^\]]*\]/s,
      `getRegistryTools: () => [${toolsList}]`
    );
  }

  return result;
}

export const importCmd: Command<void> = {
  name: 'import',
  description: `
  Import a skill from the universal format (SKILL.md + skill.extensions.yaml) back into
  the Kibana codebase. Updates the defineSkillType content and description while preserving
  hand-authored handler implementations.

  Examples:
    node scripts/agent_builder_skill import --name alert-triage --domain security --input-dir ./exported-skills/alert-triage
  `,
  flags: {
    string: ['name', 'domain', 'input-dir'],
    boolean: ['dry-run'],
    default: { 'dry-run': false },
    help: `
      --name         Skill name [required]
      --domain       Skill domain [required]
      --input-dir    Directory containing SKILL.md and skill.extensions.yaml [required]
      --dry-run      Show what would change without writing files
    `,
  },
  run: async ({ log, flagsReader }) => {
    const name = flagsReader.string('name');
    const domain = flagsReader.string('domain');
    const inputDir = flagsReader.string('input-dir');
    const dryRun = flagsReader.boolean('dry-run');

    if (!name) {
      throw createFlagError('--name is required');
    }
    if (!domain) {
      throw createFlagError('--domain is required');
    }
    if (!inputDir) {
      throw createFlagError('--input-dir is required');
    }

    validateSkillName(name);
    validateDomain(domain);

    const repoRoot = resolveRepoRoot();
    const pluginPath = DOMAIN_PLUGIN_PATHS[domain as SkillDomain];
    const snakeName = toSnakeCase(name);
    const skillFile = Path.join(repoRoot, pluginPath, 'skills', `${snakeName}_skill.ts`);

    if (!Fs.existsSync(skillFile)) {
      throw new Error(
        `Skill file not found: ${skillFile}\n` +
          `Run "generate" first to create a skill, then import content into it.`
      );
    }

    const resolvedInputDir = Path.resolve(repoRoot, inputDir);
    const skillMdPath = Path.join(resolvedInputDir, 'SKILL.md');
    const extensionsPath = Path.join(resolvedInputDir, 'skill.extensions.yaml');

    if (!Fs.existsSync(skillMdPath)) {
      throw new Error(`SKILL.md not found in ${resolvedInputDir}`);
    }

    log.info(`Importing skill "${name}" from ${Path.relative(repoRoot, resolvedInputDir)}...`);

    const skillMdContent = Fs.readFileSync(skillMdPath, 'utf-8');
    const parsed = parseSkillMd(skillMdContent);

    let extensionsMeta: ReturnType<typeof parseExtensionsYaml> | null = null;
    if (Fs.existsSync(extensionsPath)) {
      extensionsMeta = parseExtensionsYaml(Fs.readFileSync(extensionsPath, 'utf-8'));
    }

    const originalSource = Fs.readFileSync(skillFile, 'utf-8');
    const updatedSource = updateSkillFileContent(originalSource, {
      content: parsed.body,
      description: parsed.description || extensionsMeta?.description,
      tools: extensionsMeta?.registryTools,
    });

    if (originalSource === updatedSource) {
      log.info('No changes detected — skill file is already up to date.');
      return;
    }

    if (dryRun) {
      log.info('Dry-run mode — showing changes without writing:');
      log.info('');

      if (parsed.body) {
        log.info('  Content: will be updated from SKILL.md body');
      }
      if (parsed.description || extensionsMeta?.description) {
        log.info(`  Description: "${parsed.description || extensionsMeta?.description}"`);
      }
      if (extensionsMeta?.registryTools?.length) {
        log.info(`  Tools: [${extensionsMeta.registryTools.join(', ')}]`);
      }

      return;
    }

    Fs.writeFileSync(skillFile, updatedSource, 'utf-8');
    log.success(`Updated: ${Path.relative(repoRoot, skillFile)}`);

    log.info('');
    log.info('Imported fields:');
    if (parsed.body) {
      log.info('  ✓ content (from SKILL.md body)');
    }
    if (parsed.description || extensionsMeta?.description) {
      log.info('  ✓ description');
    }
    if (extensionsMeta?.registryTools?.length) {
      log.info(`  ✓ registryTools (${extensionsMeta.registryTools.length} tools)`);
    }
    log.info('');
    log.info('Handler implementations were preserved (not modified by import).');
    log.info(`Run: node scripts/agent_builder_skill validate --name ${name} --domain ${domain}`);
  },
};
