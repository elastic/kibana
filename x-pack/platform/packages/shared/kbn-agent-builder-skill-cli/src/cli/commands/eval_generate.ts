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
import { DOMAIN_PLUGIN_PATHS, ELASTIC_LICENSE_HEADER } from '../../constants';
import {
  validateSkillName,
  validateDomain,
  toSnakeCase,
  resolveRepoRoot,
  ensureDir,
  findSkillFile,
  extractSkillMetadata,
} from '../../utils';
import type { SkillFileMetadata } from '../../utils';

interface EvalTask {
  id: string;
  input: string;
  expectedBehavior: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

function generateTasksFromMetadata(meta: SkillFileMetadata, maxPerCategory: number): EvalTask[] {
  const tasks: EvalTask[] = [];
  let taskIndex = 0;

  tasks.push({
    id: `${meta.name}-basic-${++taskIndex}`,
    input: `What can you help me with regarding ${meta.name.replace(/-/g, ' ')}?`,
    expectedBehavior: 'Agent should describe the skill capabilities based on its content',
    category: 'activation',
    difficulty: 'easy',
  });

  tasks.push({
    id: `${meta.name}-activation-${++taskIndex}`,
    input: meta.description
      ? `Help me with ${meta.description.toLowerCase().slice(0, 100)}`
      : `Help me get started with ${meta.name.replace(/-/g, ' ')}`,
    expectedBehavior:
      'Agent should activate the skill and begin the workflow described in its content',
    category: 'activation',
    difficulty: 'easy',
  });

  for (const tool of meta.tools.slice(0, maxPerCategory)) {
    tasks.push({
      id: `${meta.name}-tool-${++taskIndex}`,
      input: `Use ${tool} to help me investigate the current situation`,
      expectedBehavior: `Agent should call the ${tool} tool with appropriate parameters`,
      category: 'tool-usage',
      difficulty: 'medium',
    });
  }

  if (meta.hasInlineTools) {
    tasks.push({
      id: `${meta.name}-inline-tool-${++taskIndex}`,
      input: `Run the skill's built-in tools to analyze the current data`,
      expectedBehavior: 'Agent should invoke inline tools and present their results',
      category: 'tool-usage',
      difficulty: 'medium',
    });
  }

  const sections = meta.contentSections;
  for (const sectionTitle of sections.slice(0, maxPerCategory)) {
    if (sectionTitle && !sectionTitle.includes('TODO')) {
      tasks.push({
        id: `${meta.name}-workflow-${++taskIndex}`,
        input: `Walk me through the ${sectionTitle.toLowerCase()} process`,
        expectedBehavior: `Agent should follow the instructions from the "${sectionTitle}" section`,
        category: 'workflow',
        difficulty: 'medium',
      });
    }
  }

  if (meta.hasReferencedContent && meta.referencedContentCount > 0) {
    tasks.push({
      id: `${meta.name}-refcontent-${++taskIndex}`,
      input: `Run the embedded queries to gather relevant data`,
      expectedBehavior:
        'Agent should use the referencedContent queries to retrieve data and present findings',
      category: 'workflow',
      difficulty: 'medium',
    });
  }

  tasks.push({
    id: `${meta.name}-negative-${++taskIndex}`,
    input: 'Help me write a Python script to sort a list of numbers',
    expectedBehavior: 'Agent should NOT activate this skill — the query is outside the skill scope',
    category: 'negative',
    difficulty: 'medium',
  });

  tasks.push({
    id: `${meta.name}-edge-${++taskIndex}`,
    input: 'I need help but I have no data available',
    expectedBehavior: 'Agent should handle the edge case gracefully and suggest next steps',
    category: 'edge-case',
    difficulty: 'hard',
  });

  tasks.push({
    id: `${meta.name}-multi-${++taskIndex}`,
    input: `Start a full ${meta.name.replace(/-/g, ' ')} workflow and show me the results`,
    expectedBehavior: 'Agent should execute the full workflow using multiple tools in sequence',
    category: 'multi-step',
    difficulty: 'hard',
  });

  return tasks;
}

function escapeForSingleQuoteString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function renderEvalDatasetFile(skillName: string, tasks: EvalTask[]): string {
  const datasetEntries = tasks
    .map(
      (task) => `  {
    id: '${task.id}',
    input: '${escapeForSingleQuoteString(task.input)}',
    expectedBehavior: '${escapeForSingleQuoteString(task.expectedBehavior)}',
    category: '${task.category}',
    difficulty: '${task.difficulty}',
  }`
    )
    .join(',\n');

  return `${ELASTIC_LICENSE_HEADER}

/**
 * Auto-generated eval dataset for the "${skillName}" skill.
 * Edit the tasks below to refine expected behaviors and add domain-specific scenarios.
 *
 * Run with: node scripts/agent_builder_skill eval:run --name ${skillName} --domain <domain>
 */
export interface EvalTask {
  id: string;
  input: string;
  expectedBehavior: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const evalDataset: EvalTask[] = [
${datasetEntries}
];
`;
}

export const evalGenerateCmd: Command<void> = {
  name: 'eval:generate',
  description: `
  Generate an evaluation dataset for an Agent Builder skill.
  Creates eval tasks with pass/fail rubrics based on the skill definition.
  Includes tasks for tool usage, workflows, negative tests, and edge cases.

  Examples:
    node scripts/agent_builder_skill eval:generate --name alert-triage --domain security
    node scripts/agent_builder_skill eval:generate --name alert-triage --domain security --count 3
  `,
  flags: {
    string: ['name', 'domain', 'count'],
    default: { count: '5' },
    help: `
      --name      Skill name [required]
      --domain    Skill domain [required]
      --count     Max tasks per category (default: 5)
    `,
  },
  run: async ({ log, flagsReader }) => {
    const name = flagsReader.string('name');
    const domain = flagsReader.string('domain');
    const maxPerCategory = parseInt(flagsReader.string('count') || '5', 10) || 5;

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
    const skillFile = findSkillFile(repoRoot, pluginPath, name);

    if (!skillFile) {
      throw new Error(
        `Skill file not found for "${name}" in ${pluginPath}\nRun "generate" first to scaffold the skill.`
      );
    }

    log.info(`Generating eval dataset for skill "${name}"...`);

    const meta = extractSkillMetadata(skillFile);
    const tasks = generateTasksFromMetadata(meta, maxPerCategory);

    const snakeName = toSnakeCase(name);
    const evalDir = Path.join(Path.dirname(skillFile), '__evals__');
    ensureDir(evalDir);

    const evalFile = Path.join(evalDir, `${snakeName}_eval_dataset.ts`);
    const content = renderEvalDatasetFile(name, tasks);
    Fs.writeFileSync(evalFile, content, 'utf-8');

    log.success(`Generated ${tasks.length} eval tasks: ${Path.relative(repoRoot, evalFile)}`);
    log.info('');
    log.info('Task breakdown:');

    const byCategory: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    for (const task of tasks) {
      byCategory[task.category] = (byCategory[task.category] ?? 0) + 1;
      byDifficulty[task.difficulty] = (byDifficulty[task.difficulty] ?? 0) + 1;
    }

    log.info('  By category:');
    for (const [cat, cnt] of Object.entries(byCategory)) {
      log.info(`    ${cat}: ${cnt}`);
    }
    log.info('  By difficulty:');
    for (const [diff, cnt] of Object.entries(byDifficulty)) {
      log.info(`    ${diff}: ${cnt}`);
    }

    log.info('');
    log.info('Next steps:');
    log.info(`  1. Review and edit ${Path.relative(repoRoot, evalFile)}`);
    log.info(`  2. Add domain-specific scenarios and refine expected behaviors`);
    log.info(
      `  3. Run evals: node scripts/agent_builder_skill eval:run --name ${name} --domain ${domain}`
    );
  },
};
