/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PlaywrightArgsOptions {
  configPath: string;
  /** Paths Playwright matches against test file paths, used by sharded CI steps. */
  specFiles?: string[];
  project?: string;
  grep?: string;
  grepInvert?: string;
}

/**
 * Builds the `scripts/playwright` argv.
 *
 * Spec files go ahead of every flag on purpose. Playwright declares `--project` as variadic, so a
 * filter placed after it is parsed as another project name and the run dies with
 * `Project(s) "<path>" not found`. Putting them first is the only ordering that works: `--` is not
 * an escape hatch here, since Playwright ignores the operands following it and runs everything.
 */
export const buildPlaywrightArgs = ({
  configPath,
  specFiles = [],
  project,
  grep,
  grepInvert,
}: PlaywrightArgsOptions): string[] => [
  'scripts/playwright',
  'test',
  '--config',
  configPath,
  ...specFiles,
  ...(project ? ['--project', project] : []),
  ...(grep ? ['--grep', grep] : []),
  ...(grepInvert ? ['--grep-invert', grepInvert] : []),
];
