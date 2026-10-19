/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { runScenario } from './driver';
import { targetFromEnv } from './kibana_client';
import { SCENARIOS } from './scenarios';
import { computeScorecard, scorecardMarkdown, writeScorecard } from './scorecard';
import { ingestRunDir, researchEs, setupStore } from './store';

const DEFAULT_RUNS_DIR = path.join(
  os.homedir(),
  '.agentic-work/projects/kibana/workload-isolation-research/runs'
);

const parseArgs = (argv: string[]): { cmd: string; flags: Record<string, string> } => {
  const [cmd, ...rest] = argv;
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      flags[k] = v ?? (rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : 'true');
    }
  }
  return { cmd, flags };
};

const USAGE = `workload isolation harness (RESEARCH ONLY)

  run.js setup-store
  run.js run --scenario <name> [--lane lane-0] [--variant baseline] [--hypothesis "..."] [--expected '{json}']
             [--target local|qaf] [--qaf-project-id id] [--image-digest sha] [--baseline-commit sha]
             [--expected-pods 1] [--runs-dir dir] [--no-ingest]
  run.js ingest --dir <runDir>
  run.js scorecard --run-id <id> [--runs-dir dir]

env: WIR_KIBANA_URL, WIR_KIBANA_API_KEY | WIR_KIBANA_BASIC (user:pass), WIR_RESEARCH_ES_URL (default http://localhost:9250)
scenarios: ${Object.keys(SCENARIOS).join(', ')}
`;

export const main = async (): Promise<void> => {
  const { cmd, flags } = parseArgs(process.argv.slice(2));
  const es = researchEs();
  const runsDir = flags['runs-dir'] ?? DEFAULT_RUNS_DIR;
  switch (cmd) {
    case 'setup-store':
      await setupStore(es);
      // eslint-disable-next-line no-console
      console.log('research store templates installed');
      return;
    case 'run': {
      const scenario = SCENARIOS[flags.scenario];
      if (!scenario) throw new Error(`unknown scenario ${flags.scenario}\n${USAGE}`);
      const { runId, dir } = await runScenario({
        target: targetFromEnv(),
        targetKind: (flags.target as 'local' | 'qaf') ?? 'local',
        scenario,
        lane: flags.lane ?? 'lane-0',
        variant: flags.variant ?? 'baseline',
        hypothesis: flags.hypothesis ?? '',
        expected: flags.expected ? JSON.parse(flags.expected) : {},
        baselineCommit: flags['baseline-commit'] ?? '',
        imageDigest: flags['image-digest'] ?? null,
        qafProjectId: flags['qaf-project-id'] ?? null,
        runsDir,
        repoDir: path.resolve(__dirname, '../../../../../../..'),
        configOverrides: flags['config-overrides'] ? JSON.parse(flags['config-overrides']) : {},
        expectedPods: Number(flags['expected-pods'] ?? 1),
      });
      if (flags['no-ingest'] === 'true') return;
      await setupStore(es);
      const counts = await ingestRunDir(es, dir);
      const { manifest, rows } = await computeScorecard(es, runId);
      await writeScorecard(es, rows);
      const md = scorecardMarkdown(manifest, rows);
      fs.writeFileSync(path.join(dir, 'scorecard.md'), md);
      fs.writeFileSync(path.join(dir, 'scorecard.json'), JSON.stringify(rows, null, 2));
      // eslint-disable-next-line no-console
      console.log(`ingested ${JSON.stringify(counts)}\n${md}`);
      return;
    }
    case 'ingest': {
      await setupStore(es);
      // eslint-disable-next-line no-console
      console.log(await ingestRunDir(es, flags.dir));
      return;
    }
    case 'scorecard': {
      const { manifest, rows } = await computeScorecard(es, flags['run-id']);
      await writeScorecard(es, rows);
      const md = scorecardMarkdown(manifest, rows);
      const dir = path.join(runsDir, flags['run-id']);
      if (fs.existsSync(dir)) {
        fs.writeFileSync(path.join(dir, 'scorecard.md'), md);
        fs.writeFileSync(path.join(dir, 'scorecard.json'), JSON.stringify(rows, null, 2));
      }
      // eslint-disable-next-line no-console
      console.log(md);
      return;
    }
    default:
      // eslint-disable-next-line no-console
      console.log(USAGE);
  }
};
