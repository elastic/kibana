/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'child_process';
import type { Command } from '@kbn/dev-cli-runner';
import { readSuiteMetadata } from '../suites';

interface GhLabel {
  name: string;
  color: string;
  description: string;
}

const runGh = (
  args: string[],
  options?: { repo?: string }
): { status: number | null; stdout: string; stderr: string } => {
  const ghArgs = [...args];
  if (options?.repo) {
    ghArgs.push('--repo', options.repo);
  }

  const result = spawnSync('gh', ghArgs, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
};

const listEvalsLabels = (options?: { repo?: string }): Map<string, GhLabel> => {
  const res = runGh(
    ['label', 'list', '--search', 'evals:', '--limit', '1000', '--json', 'name,color,description'],
    options
  );

  if (res.status !== 0) {
    throw new Error(`Failed to list labels: ${res.stderr || res.stdout}`);
  }

  try {
    const parsed = JSON.parse(res.stdout) as GhLabel[];
    return new Map(parsed.filter((l) => l.name.startsWith('evals:')).map((l) => [l.name, l]));
  } catch {
    throw new Error('Failed to parse GitHub label list JSON output');
  }
};

const buildSuiteDescription = (
  suiteId: string,
  template?: { prefix: string; suffix: string }
): string => {
  const prefix = template?.prefix ?? 'Run the ';
  const suffix = template?.suffix ?? ' @kbn/evals';
  return `${prefix}${suiteId}${suffix}`;
};

export const labelsCmd: Command<void> = {
  name: 'labels',
  description: `
  Create or update GitHub labels used to trigger evals in PR CI.

  Examples:
    node scripts/evals labels
    node scripts/evals labels attack-discovery
    node scripts/evals labels --repo elastic/kibana --update-existing
  `,
  flags: {
    boolean: ['update-existing', 'dry-run'],
    string: ['repo'],
    default: { 'update-existing': false, 'dry-run': false },
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();
    const repo = flagsReader.string('repo') ?? undefined;
    const updateExisting = flagsReader.boolean('update-existing');
    const dryRun = flagsReader.boolean('dry-run');

    const positionals = flagsReader.getPositionals();
    const onlySuites = positionals.length > 0 ? new Set(positionals) : null;

    const suites = readSuiteMetadata(repoRoot, log).filter(
      (suite) => !onlySuites || onlySuites.has(suite.id)
    );

    if (suites.length === 0) {
      log.warning('No eval suites found to generate labels from evals.suites.json.');
      return;
    }

    const suiteLabels = suites.flatMap((suite) => {
      const labels = suite.ciLabels?.length ? suite.ciLabels : [`evals:${suite.id}`];
      return labels.filter((label) => label.startsWith('evals:'));
    });

    const allLabels = Array.from(new Set(['evals:all', ...suiteLabels])).sort();

    const existingByName = listEvalsLabels({ repo });
    const templateLabel =
      existingByName.get('evals:agent-builder') ?? existingByName.get('evals:all');
    const defaultColor = templateLabel?.color ?? '2AEC8F';
    const templateDesc = templateLabel?.description ?? '';
    const templatePrefix = 'Run the ';
    const templateSuffix = ' @kbn/evals';
    const template =
      templateDesc.startsWith(templatePrefix) && templateDesc.endsWith(templateSuffix)
        ? { prefix: templatePrefix, suffix: templateSuffix }
        : undefined;

    const desired = new Map<string, { color: string; description: string }>();
    desired.set('evals:all', { color: defaultColor, description: 'Run all @kbn/evals' });
    for (const label of allLabels) {
      if (label === 'evals:all') continue;
      const suiteId = label.slice('evals:'.length);
      desired.set(label, {
        color: defaultColor,
        description: buildSuiteDescription(suiteId, template),
      });
    }

    log.info(`Syncing ${desired.size} eval label(s)${repo ? ` in ${repo}` : ''}...`);
    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];

    for (const [name, spec] of desired) {
      const existing = existingByName.get(name);
      if (existing) {
        if (!updateExisting) {
          skipped.push(name);
          continue;
        }

        const needsUpdate =
          existing.color.toLowerCase() !== spec.color.toLowerCase() ||
          (existing.description ?? '') !== spec.description;

        if (!needsUpdate) {
          skipped.push(name);
          continue;
        }

        if (dryRun) {
          updated.push(name);
          continue;
        }

        const res = runGh(
          ['label', 'edit', name, '--color', spec.color, '--description', spec.description],
          { repo }
        );
        if (res.status !== 0) {
          throw new Error(`Failed to update label ${name}: ${res.stderr || res.stdout}`);
        }
        updated.push(name);
        continue;
      }

      if (dryRun) {
        created.push(name);
        continue;
      }

      const res = runGh(
        ['label', 'create', name, '--color', spec.color, '--description', spec.description],
        { repo }
      );
      if (res.status !== 0) {
        throw new Error(`Failed to create label ${name}: ${res.stderr || res.stdout}`);
      }
      created.push(name);
    }

    if (created.length) log.info(`Created: ${created.join(', ')}`);
    if (updated.length) log.info(`Updated: ${updated.join(', ')}`);
    if (skipped.length) log.info(`Unchanged: ${skipped.join(', ')}`);
    if (dryRun) log.info('Dry run: no changes were applied.');
  },
};
