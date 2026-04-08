/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { execFileSync } from 'child_process';
import { startServer } from './server';

const DEFAULT_PORT = 5678;

function parseArgs(): { port: number; repoRoot: string } {
  const args = process.argv.slice(2);
  let port = DEFAULT_PORT;
  let repoRoot = path.resolve(__dirname, '..', '..', '..');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    }
    if (args[i] === '--root' && args[i + 1]) {
      repoRoot = path.resolve(args[i + 1]);
      i++;
    }
  }

  return { port, repoRoot };
}

function buildUi(repoRoot: string): void {
  const tscBin = path.join(repoRoot, 'node_modules', '.bin', 'tsc');
  const uiTsconfig = path.resolve(__dirname, 'ui', 'tsconfig.json');

  /* eslint-disable no-console */
  console.log('Building UI...');
  /* eslint-enable no-console */

  execFileSync(tscBin, ['--project', uiTsconfig], { stdio: 'inherit' });

  /* eslint-disable no-console */
  console.log('UI build complete.');
  /* eslint-enable no-console */
}

function main(): void {
  const { port, repoRoot } = parseArgs();

  /* eslint-disable no-console */
  console.log('Starting Test Management UI...');
  console.log(`  Repo root: ${repoRoot}`);
  console.log(`  Port: ${port}`);
  /* eslint-enable no-console */

  buildUi(repoRoot);
  startServer({ port, repoRoot });
}

main();
