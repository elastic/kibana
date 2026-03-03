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
import {
  DOMAIN_PLUGIN_PATHS,
  SKILL_NAME_REGEX,
  MAX_SKILL_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_INLINE_TOOLS,
} from '../../constants';
import type { SkillDomain } from '../../constants';
import {
  validateSkillName,
  validateDomain,
  toSnakeCase,
  resolveRepoRoot,
  discoverSkillFiles,
} from '../../utils';

interface ValidationResult {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}

function validateSkillFile(filePath: string, log: ToolingLog): ValidationResult {
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];
  const content = Fs.readFileSync(filePath, 'utf-8');

  const hasDefineSkillType = content.includes('defineSkillType');
  checks.push({
    name: 'uses-define-skill-type',
    passed: hasDefineSkillType,
    message: hasDefineSkillType
      ? 'Uses defineSkillType()'
      : 'Must use defineSkillType() from @kbn/agent-builder-server/skills',
  });

  const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
  if (nameMatch) {
    const name = nameMatch[1];
    const nameValid = SKILL_NAME_REGEX.test(name) && name.length <= MAX_SKILL_NAME_LENGTH;
    checks.push({
      name: 'valid-name',
      passed: nameValid,
      message: nameValid
        ? `Name "${name}" is valid`
        : `Name "${name}" must match ${SKILL_NAME_REGEX} and be <= ${MAX_SKILL_NAME_LENGTH} chars`,
    });
  } else {
    checks.push({
      name: 'valid-name',
      passed: false,
      message: 'Could not extract skill name from file',
    });
  }

  const descMatch = content.match(/description:\s*\n?\s*['"`]([^'"`]+)['"`]/s);
  if (descMatch) {
    const desc = descMatch[1];
    const descValid = desc.length > 0 && desc.length <= MAX_DESCRIPTION_LENGTH;
    checks.push({
      name: 'valid-description',
      passed: descValid,
      message: descValid
        ? `Description length ${desc.length} is within limits`
        : `Description must be 1-${MAX_DESCRIPTION_LENGTH} characters`,
    });
  }

  const contentMatch = content.match(/content:\s*`([^`]*)`/s);
  if (contentMatch) {
    const skillContent = contentMatch[1];
    checks.push({
      name: 'non-empty-content',
      passed: skillContent.trim().length > 0,
      message:
        skillContent.trim().length > 0
          ? `Content has ${skillContent.trim().length} characters`
          : 'Skill content must not be empty',
    });

    const hasTodo = skillContent.includes('TODO');
    if (hasTodo) {
      checks.push({
        name: 'no-todos-in-content',
        passed: false,
        message: 'Skill content contains TODO markers — replace them before shipping',
      });
    }
  }

  const basePathMatch = content.match(/basePath:\s*['"]([^'"]+)['"]/);
  if (basePathMatch) {
    const basePath = basePathMatch[1];
    const basePathValid = basePath.startsWith('skills/');
    checks.push({
      name: 'valid-base-path',
      passed: basePathValid,
      message: basePathValid
        ? `Base path "${basePath}" starts with skills/`
        : `Base path "${basePath}" must start with "skills/"`,
    });
  }

  const inlineToolMatches = content.match(/getInlineTools/g);
  if (inlineToolMatches) {
    const toolCountMatch = content.match(/id:\s*['"][^'"]+['"]/g);
    const estimatedToolCount = toolCountMatch ? toolCountMatch.length - 1 : 0;
    if (estimatedToolCount > MAX_INLINE_TOOLS) {
      checks.push({
        name: 'inline-tool-limit',
        passed: false,
        message: `Estimated ${estimatedToolCount} inline tools exceeds the limit of ${MAX_INLINE_TOOLS}`,
      });
    }
  }

  const schemaImport = content.includes("from '@kbn/zod'") || content.includes('from "@kbn/zod"');
  if (schemaImport) {
    checks.push({
      name: 'uses-kbn-zod',
      passed: true,
      message: 'Correctly imports from @kbn/zod',
    });
  }

  const hasTest = Fs.existsSync(filePath.replace('.ts', '.test.ts'));
  checks.push({
    name: 'has-test-file',
    passed: hasTest,
    message: hasTest
      ? `Test file exists: ${Path.basename(filePath.replace('.ts', '.test.ts'))}`
      : 'Missing test file — run generate to create one',
  });

  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}

export const validateCmd: Command<void> = {
  name: 'validate',
  description: `
  Validate Agent Builder skill definitions for correctness, naming conventions,
  schema complexity, and model compatibility.

  Can validate a single skill or all skills in a domain.

  Examples:
    node scripts/agent_builder_skill validate --name alert-triage --domain security
    node scripts/agent_builder_skill validate --domain security
    node scripts/agent_builder_skill validate --all
  `,
  flags: {
    string: ['name', 'domain'],
    boolean: ['all'],
    default: { all: false },
    help: `
      --name      Skill name to validate (optional if --domain or --all)
      --domain    Domain to validate all skills in (security, observability, platform, search)
      --all       Validate all skills across all domains
    `,
  },
  run: async ({ log, flagsReader }) => {
    const name = flagsReader.string('name');
    const domain = flagsReader.string('domain');
    const all = flagsReader.boolean('all');
    const repoRoot = resolveRepoRoot();

    if (!name && !domain && !all) {
      throw createFlagError('Provide --name and --domain, --domain, or --all');
    }

    let filesToValidate: string[] = [];

    if (all) {
      for (const d of Object.keys(DOMAIN_PLUGIN_PATHS) as SkillDomain[]) {
        filesToValidate.push(...discoverSkillFiles(repoRoot, DOMAIN_PLUGIN_PATHS[d], log));
      }
    } else if (domain) {
      validateDomain(domain);
      const pluginPath = DOMAIN_PLUGIN_PATHS[domain as SkillDomain];

      if (name) {
        validateSkillName(name);
        const snakeName = toSnakeCase(name);
        const skillFile = Path.join(repoRoot, pluginPath, 'skills', `${snakeName}_skill.ts`);
        if (!Fs.existsSync(skillFile)) {
          throw new Error(`Skill file not found: ${skillFile}`);
        }
        filesToValidate = [skillFile];
      } else {
        filesToValidate = discoverSkillFiles(repoRoot, pluginPath, log);
      }
    }

    if (filesToValidate.length === 0) {
      log.warning('No skill files found to validate.');
      return;
    }

    log.info(`Validating ${filesToValidate.length} skill file(s)...`);
    log.info('');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const file of filesToValidate) {
      const relativePath = Path.relative(repoRoot, file);
      const result = validateSkillFile(file, log);

      if (result.passed) {
        log.success(`✓ ${relativePath}`);
        totalPassed++;
      } else {
        log.error(`✗ ${relativePath}`);
        totalFailed++;
      }

      for (const check of result.checks) {
        const icon = check.passed ? '  ✓' : '  ✗';
        const logFn = check.passed ? log.info.bind(log) : log.warning.bind(log);
        logFn(`${icon} [${check.name}] ${check.message}`);
      }
      log.info('');
    }

    log.info('---');
    log.info(`Results: ${totalPassed} passed, ${totalFailed} failed out of ${filesToValidate.length} skills`);

    if (totalFailed > 0) {
      process.exitCode = 1;
    }
  },
};
