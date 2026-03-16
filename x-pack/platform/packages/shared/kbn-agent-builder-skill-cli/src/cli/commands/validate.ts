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
  MIN_CONTENT_LENGTH,
  DOMAIN_BASE_PATHS,
} from '../../constants';
import type { SkillDomain } from '../../constants';
import {
  validateSkillName,
  validateDomain,
  resolveRepoRoot,
  discoverSkillFiles,
  discoverRegisteredToolIds,
  findSkillFile,
} from '../../utils';
import { renderSkillTestFile } from '../../templates/test';

interface ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  fixable?: boolean;
}

interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
}

function validateSkillFile(filePath: string, knownToolIds: Set<string>): ValidationResult {
  const checks: ValidationCheck[] = [];
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
    const trimmedContent = skillContent.trim();
    checks.push({
      name: 'non-empty-content',
      passed: trimmedContent.length > 0,
      message:
        trimmedContent.length > 0
          ? `Content has ${trimmedContent.length} characters`
          : 'Skill content must not be empty',
    });

    const hasTodo = skillContent.includes('TODO');
    if (hasTodo) {
      checks.push({
        name: 'no-todos-in-content',
        passed: false,
        message: 'Skill content contains TODO markers — replace them before shipping',
        fixable: true,
      });
    }

    if (trimmedContent.length > 0 && trimmedContent.length < MIN_CONTENT_LENGTH) {
      checks.push({
        name: 'content-quality-length',
        passed: false,
        message: `Content is only ${trimmedContent.length} chars — may be too sparse for effective agent guidance (recommend >= ${MIN_CONTENT_LENGTH})`,
      });
    }

    const hasHeaders = /^##\s+/m.test(skillContent);
    if (trimmedContent.length > 0 && !hasHeaders) {
      checks.push({
        name: 'content-quality-structure',
        passed: false,
        message:
          'Content lacks structured sections (no ## headers) — add sections for agent clarity',
      });
    }

    const toolIds = content.match(/getRegistryTools:\s*\(\)\s*=>\s*\[([^\]]*)\]/);
    const hasToolRefs = toolIds && toolIds[1].trim().length > 0;
    if (trimmedContent.length > MIN_CONTENT_LENGTH && hasToolRefs) {
      const registryToolsList = toolIds[1]
        .split(',')
        .map((t) => t.trim().replace(/['"]/g, ''))
        .filter(Boolean);
      const contentMentionsTools = registryToolsList.some((toolId) =>
        skillContent.includes(toolId)
      );
      if (!contentMentionsTools) {
        checks.push({
          name: 'content-quality-tool-refs',
          passed: false,
          message:
            'Content does not mention any of the registered tool IDs — add tool usage guidance',
        });
      }
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
      fixable: !basePathValid,
    });
  }

  const inlineToolMatches = content.match(/getInlineTools/g);
  if (inlineToolMatches) {
    const toolIdMatches = content.match(/id:\s*['"][a-z]+\.[a-z._-]+['"]/g);
    const estimatedToolCount = toolIdMatches?.length ?? 0;
    if (estimatedToolCount > MAX_INLINE_TOOLS) {
      checks.push({
        name: 'inline-tool-limit',
        passed: false,
        message: `Estimated ${estimatedToolCount} inline tools exceeds the limit of ${MAX_INLINE_TOOLS}`,
      });
    }
  }

  const schemaImport =
    content.includes("from '@kbn/zod'") ||
    content.includes('from "@kbn/zod"') ||
    content.includes("from '@kbn/zod/v4'") ||
    content.includes('from "@kbn/zod/v4"');
  if (schemaImport) {
    checks.push({
      name: 'uses-kbn-zod',
      passed: true,
      message: 'Correctly imports from @kbn/zod',
    });
  }

  if (content.includes('referencedContent')) {
    const refContentMatches = content.match(/content:\s*`([^`]*)`/g);
    const refPathMatches = content.match(/relativePath:\s*['"]([^'"]*)['"]/g);

    if (refPathMatches) {
      for (const pathMatch of refPathMatches) {
        const pathVal = pathMatch.match(/['"]([^'"]*)['"]/)?.[1] ?? '';
        if (!pathVal || pathVal.length === 0) {
          checks.push({
            name: 'referenced-content-path',
            passed: false,
            message: 'referencedContent has an empty relativePath',
          });
        }
      }
    }

    const refBlockCount = refPathMatches?.length ?? 0;
    if (refBlockCount > 0 && (!refContentMatches || refContentMatches.length < refBlockCount + 1)) {
      checks.push({
        name: 'referenced-content-has-content',
        passed: false,
        message: 'One or more referencedContent entries may have empty content',
      });
    }
  }

  if (knownToolIds.size > 0) {
    const registryToolsMatch = content.match(/getRegistryTools:\s*\(\)\s*=>\s*\[([^\]]*)\]/);
    if (registryToolsMatch) {
      const toolsList = registryToolsMatch[1]
        .split(',')
        .map((t) => t.trim().replace(/['"`]/g, ''))
        .filter(Boolean);

      const unknownTools = toolsList.filter((t) => !knownToolIds.has(t));
      if (unknownTools.length > 0) {
        checks.push({
          name: 'registry-tools-exist',
          passed: false,
          message: `Unknown registry tool IDs: ${unknownTools.join(
            ', '
          )} — verify they exist in the codebase`,
        });
      }
    }
  }

  const hasTest = Fs.existsSync(filePath.replace('.ts', '.test.ts'));
  checks.push({
    name: 'has-test-file',
    passed: hasTest,
    message: hasTest
      ? `Test file exists: ${Path.basename(filePath.replace('.ts', '.test.ts'))}`
      : 'Missing test file — run generate to create one',
    fixable: !hasTest,
  });

  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}

function applyFixes(filePath: string, checks: ValidationCheck[], log: ToolingLog): number {
  let fixCount = 0;

  const failedFixable = checks.filter((c) => !c.passed && c.fixable);
  if (failedFixable.length === 0) return 0;

  for (const check of failedFixable) {
    if (check.name === 'has-test-file') {
      const testPath = filePath.replace('.ts', '.test.ts');
      const source = Fs.readFileSync(filePath, 'utf-8');
      const nameMatch = source.match(/name:\s*['"]([^'"]+)['"]/);
      const skillName = nameMatch?.[1] ?? Path.basename(filePath, '.ts');
      Fs.writeFileSync(testPath, renderSkillTestFile({ name: skillName }), 'utf-8');
      log.success(`  Fixed: created test file ${Path.basename(testPath)}`);
      fixCount++;
    }

    if (check.name === 'valid-base-path') {
      const source = Fs.readFileSync(filePath, 'utf-8');
      const pathSegments = filePath.split(Path.sep);
      const solutionIdx = pathSegments.indexOf('solutions');
      let defaultBase = 'skills/platform';
      if (solutionIdx >= 0) {
        const solutionName = pathSegments[solutionIdx + 1];
        if (solutionName in DOMAIN_BASE_PATHS) {
          defaultBase = DOMAIN_BASE_PATHS[solutionName as SkillDomain];
        }
      }
      const updated = source.replace(/basePath:\s*['"]([^'"]+)['"]/, `basePath: '${defaultBase}'`);
      if (updated !== source) {
        Fs.writeFileSync(filePath, updated, 'utf-8');
        log.success(`  Fixed: updated basePath to '${defaultBase}'`);
        fixCount++;
      }
    }
  }

  return fixCount;
}

export const validateCmd: Command<void> = {
  name: 'validate',
  description: `
  Validate Agent Builder skill definitions for correctness, naming conventions,
  schema complexity, content quality, and tool reference integrity.

  Can validate a single skill or all skills in a domain.

  Examples:
    node scripts/agent_builder_skill validate --name alert-triage --domain security
    node scripts/agent_builder_skill validate --domain security
    node scripts/agent_builder_skill validate --all
    node scripts/agent_builder_skill validate --all --fix
  `,
  flags: {
    string: ['name', 'domain'],
    boolean: ['all', 'fix'],
    default: { all: false, fix: false },
    help: `
      --name      Skill name to validate (optional if --domain or --all)
      --domain    Domain to validate all skills in (security, observability, platform)
      --all       Validate all skills across all domains
      --fix       Auto-fix simple issues (missing tests, invalid basePath)
    `,
  },
  run: async ({ log, flagsReader }) => {
    const name = flagsReader.string('name');
    const domain = flagsReader.string('domain');
    const all = flagsReader.boolean('all');
    const fix = flagsReader.boolean('fix');
    const repoRoot = resolveRepoRoot();

    if (!name && !domain && !all) {
      throw createFlagError('Provide --name and --domain, --domain, or --all');
    }

    if (name && !domain) {
      throw createFlagError('--domain is required when using --name');
    }

    let filesToValidate: string[] = [];

    if (all) {
      for (const d of Object.keys(DOMAIN_PLUGIN_PATHS) as SkillDomain[]) {
        filesToValidate.push(...discoverSkillFiles(repoRoot, DOMAIN_PLUGIN_PATHS[d], log));
      }
    } else if (domain) {
      validateDomain(domain);
      const pluginPath = DOMAIN_PLUGIN_PATHS[domain];

      if (name) {
        validateSkillName(name);
        const skillFile = findSkillFile(repoRoot, pluginPath, name);
        if (!skillFile) {
          throw new Error(`Skill file not found for "${name}" in ${pluginPath}`);
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

    const allPluginPaths = Object.values(DOMAIN_PLUGIN_PATHS);
    const knownToolIds = discoverRegisteredToolIds(repoRoot, allPluginPaths);

    log.info(`Validating ${filesToValidate.length} skill file(s)...`);
    if (knownToolIds.size > 0) {
      log.info(`  Known tool IDs: ${knownToolIds.size}`);
    }
    log.info('');

    let totalPassed = 0;
    let totalFailed = 0;
    let totalFixed = 0;
    const seenIds = new Map<string, string>();

    for (const file of filesToValidate) {
      const relativePath = Path.relative(repoRoot, file);
      const result = validateSkillFile(file, knownToolIds);

      const source = Fs.readFileSync(file, 'utf-8');
      const idMatch = source.match(/id:\s*['"]([^'"]+)['"]/);
      const skillId = idMatch?.[1] ?? 'unknown';

      if (seenIds.has(skillId) && skillId !== 'unknown') {
        result.checks.push({
          name: 'unique-id',
          passed: false,
          message: `Duplicate skill ID "${skillId}" — also found in ${seenIds.get(skillId)}`,
        });
        result.passed = false;
      }
      seenIds.set(skillId, relativePath);

      if (result.passed) {
        log.success(`✓ ${relativePath}`);
        totalPassed++;
      } else {
        log.error(`✗ ${relativePath}`);
        totalFailed++;
      }

      for (const check of result.checks) {
        const icon = check.passed ? '  ✓' : '  ✗';
        const fixTag = !check.passed && check.fixable ? ' [fixable]' : '';
        const logFn = check.passed ? log.info.bind(log) : log.warning.bind(log);
        logFn(`${icon} [${check.name}] ${check.message}${fixTag}`);
      }

      if (fix && !result.passed) {
        const fixed = applyFixes(file, result.checks, log);
        totalFixed += fixed;
      }

      log.info('');
    }

    log.info('---');
    log.info(
      `Results: ${totalPassed} passed, ${totalFailed} failed out of ${filesToValidate.length} skills`
    );
    if (totalFixed > 0) {
      log.info(`Auto-fixed: ${totalFixed} issue(s)`);
    }

    if (totalFailed > 0 && !fix) {
      log.info('Run with --fix to auto-fix simple issues.');
    }

    if (totalFailed > 0) {
      process.exitCode = 1;
    }
  },
};
