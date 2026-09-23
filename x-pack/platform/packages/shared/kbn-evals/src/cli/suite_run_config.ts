/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { FlagsReader } from '@kbn/dev-cli-runner';
import type { EvalSuiteDefinition } from './suites';

export const suiteOptionNames = ['dataset-id', 'concurrency'] as const;

type SuiteOptionName = (typeof suiteOptionNames)[number];

export interface EvalSuiteRunEnv {
  playwright: Record<string, string>;
  server: Record<string, string>;
}

export interface EvalSuiteRunConfig {
  options: readonly SuiteOptionName[];
  resolve: (input: {
    options: Partial<Record<SuiteOptionName, string>>;
    env: NodeJS.ProcessEnv;
  }) => EvalSuiteRunEnv;
}

/** Resolves suite-owned options before either the server or Playwright starts. */
export const readSuiteRunEnv = async (
  repoRoot: string,
  flagsReader: FlagsReader,
  suite?: EvalSuiteDefinition
): Promise<EvalSuiteRunEnv> => {
  const options: Partial<Record<SuiteOptionName, string>> = {};
  for (const name of suiteOptionNames) {
    const value = flagsReader.string(name);
    if (value !== undefined) options[name] = value;
  }

  let config: EvalSuiteRunConfig | undefined;
  if (suite?.runConfigPath) {
    const loaded = (await import(Path.resolve(repoRoot, suite.runConfigPath))).runConfig as
      | EvalSuiteRunConfig
      | undefined;
    if (
      !loaded ||
      !Array.isArray(loaded.options) ||
      loaded.options.some((name) => !suiteOptionNames.includes(name)) ||
      typeof loaded.resolve !== 'function'
    ) {
      throw new Error(
        `Invalid suite run configuration at ${suite.runConfigPath}: export runConfig with supported options and a resolve function.`
      );
    }
    config = loaded;
  }
  for (const name of suiteOptionNames) {
    if (options[name] !== undefined && !config?.options.includes(name)) {
      throw createFlagError(`The selected suite does not declare support for --${name}.`);
    }
  }

  return config?.resolve({ options, env: process.env }) ?? { playwright: {}, server: {} };
};
