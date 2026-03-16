/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import type { Command } from '@kbn/dev-cli-runner';
import { DOMAIN_PLUGIN_PATHS } from '../../constants';
import type { SkillDomain } from '../../constants';
import {
  validateDomain,
  resolveRepoRoot,
  discoverSkillFiles,
  extractSkillMetadata,
} from '../../utils';

export const listCmd: Command<void> = {
  name: 'list',
  description: `
  List all Agent Builder skills across domains with a summary of each.

  Examples:
    node scripts/agent_builder_skill list
    node scripts/agent_builder_skill list --domain security
    node scripts/agent_builder_skill list --json
  `,
  flags: {
    string: ['domain'],
    boolean: ['json'],
    default: { json: false },
    help: `
      --domain    Filter to a specific domain (security, observability, platform)
      --json      Output as JSON instead of a table
    `,
  },
  run: async ({ log, flagsReader }) => {
    const domain = flagsReader.string('domain');
    const jsonOutput = flagsReader.boolean('json');
    const repoRoot = resolveRepoRoot();

    const domains: SkillDomain[] = domain
      ? (validateDomain(domain), [domain])
      : (Object.keys(DOMAIN_PLUGIN_PATHS) as SkillDomain[]);

    const skills: Array<{
      domain: string;
      file: string;
      id: string;
      name: string;
      registryTools: number;
      inlineTools: boolean;
      referencedContent: number;
      hasTest: boolean;
      hasEvals: boolean;
      contentLength: number;
      sections: number;
    }> = [];

    for (const d of domains) {
      const files = discoverSkillFiles(repoRoot, DOMAIN_PLUGIN_PATHS[d], log);
      for (const file of files) {
        const meta = extractSkillMetadata(file);
        skills.push({
          domain: d,
          file: Path.relative(repoRoot, file),
          id: meta.id,
          name: meta.name,
          registryTools: meta.tools.length,
          inlineTools: meta.hasInlineTools,
          referencedContent: meta.referencedContentCount,
          hasTest: meta.hasTest,
          hasEvals: meta.hasEvals,
          contentLength: meta.content.length,
          sections: meta.contentSections.length,
        });
      }
    }

    if (skills.length === 0) {
      log.warning('No skills found.');
      return;
    }

    if (jsonOutput) {
      log.write(JSON.stringify(skills, null, 2));
      return;
    }

    log.info(`Found ${skills.length} skill(s) across ${domains.length} domain(s):\n`);

    const pad = (s: string, len: number) => s.padEnd(len);
    const header = `${pad('Domain', 15)} ${pad('ID', 30)} ${pad('Tools', 6)} ${pad(
      'Inline',
      7
    )} ${pad('RefCnt', 7)} ${pad('Test', 5)} ${pad('Evals', 6)} ${pad('Content', 8)}`;
    log.info(header);
    log.info('-'.repeat(header.length));

    for (const s of skills) {
      log.info(
        `${pad(s.domain, 15)} ${pad(s.id, 30)} ${pad(String(s.registryTools), 6)} ${pad(
          s.inlineTools ? 'yes' : 'no',
          7
        )} ${pad(String(s.referencedContent), 7)} ${pad(s.hasTest ? '✓' : '✗', 5)} ${pad(
          s.hasEvals ? '✓' : '✗',
          6
        )} ${pad(`${s.contentLength}c`, 8)}`
      );
    }

    log.info('');

    const withTests = skills.filter((s) => s.hasTest).length;
    const withEvals = skills.filter((s) => s.hasEvals).length;
    log.info(
      `Summary: ${withTests}/${skills.length} have tests, ${withEvals}/${skills.length} have evals`
    );
  },
};
