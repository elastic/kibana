/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import Path from 'node:path';
import * as Babel from '@babel/core';
import {
  requestRunner,
  startHardenedRunner,
  stopHardenedRunner,
} from './vega_validator_test_utils';

const SOURCE_WRAPPER_PATH = Path.resolve(__dirname, '../vega_validator_wrapper.cjs');
const SOURCE_HOST_PATH = Path.resolve(__dirname, '../vega_validator.ts');
const SOURCE_TASK_PATH = Path.resolve(__dirname, '../vega_validator_worker.ts');
const TARGET_ROOT = Path.resolve(__dirname, '../../target');
const requireForTest = createRequire(__filename);
const { ImportLocator } = requireForTest('@kbn/import-locator') as {
  ImportLocator: new () => {
    get: (path: string, content: string) => Set<string>;
  };
};

describe('Vega validator distributable', () => {
  let buildDirectory: string;
  let hardenedRunner: ReturnType<typeof startHardenedRunner>;

  beforeAll(async () => {
    await mkdir(TARGET_ROOT, { recursive: true });
    buildDirectory = await mkdtemp(Path.join(TARGET_ROOT, 'vega-validator-dist-'));

    const [wrapperSource, taskSource] = await Promise.all([
      readFile(SOURCE_WRAPPER_PATH, 'utf8'),
      readFile(SOURCE_TASK_PATH, 'utf8'),
    ]);
    const builtTask = Babel.transformSync(taskSource, {
      babelrc: false,
      configFile: false,
      filename: SOURCE_TASK_PATH,
      presets: [require.resolve('@kbn/babel-preset/node_preset')],
    })?.code;
    if (!builtTask) {
      throw new Error('Babel failed to build the Vega validator worker task');
    }

    const builtWrapperPath = Path.join(buildDirectory, 'vega_validator_wrapper.cjs');
    const setupNodeEnvDirectory = Path.join(
      buildDirectory,
      'node_modules',
      '@kbn',
      'setup-node-env'
    );
    await mkdir(setupNodeEnvDirectory, { recursive: true });
    await Promise.all([
      writeFile(builtWrapperPath, wrapperSource),
      writeFile(Path.join(buildDirectory, 'vega_validator_worker.js'), builtTask),
      // The setup package is built independently in a real distributable. This
      // fixture keeps the smoke test focused on the validator's production
      // layout while exercising the wrapper's production-only require path.
      writeFile(Path.join(setupNodeEnvDirectory, 'dist.js'), 'module.exports = {};\n'),
    ]);

    hardenedRunner = startHardenedRunner({
      workerPath: builtWrapperPath,
      nodeEnv: 'production',
    });
  });

  afterAll(async () => {
    await stopHardenedRunner(hardenedRunner);
    await rm(buildDirectory, { recursive: true, force: true });
  });

  it('loads the untransformed wrapper and transpiled task in production mode', async () => {
    const result = await requestRunner(hardenedRunner, {
      spec: {
        $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
        data: { values: [] },
        mark: 'bar',
        encoding: { x: { field: 'status', type: 'nominal' } },
      },
    });

    expect(result).toEqual(expect.objectContaining({ ok: true }));
  });

  it('exposes the wrapper and Vega packages to distributable dependency tracing', async () => {
    const [hostSource, wrapperSource] = await Promise.all([
      readFile(SOURCE_HOST_PATH, 'utf8'),
      readFile(SOURCE_WRAPPER_PATH, 'utf8'),
    ]);
    const importLocator = new ImportLocator();

    expect(importLocator.get(SOURCE_HOST_PATH, hostSource)).toContain(
      './vega_validator_wrapper.cjs'
    );
    expect([...importLocator.get(SOURCE_WRAPPER_PATH, wrapperSource)]).toEqual(
      expect.arrayContaining(['vega', 'vega-lite', 'vega-interpreter'])
    );
  });
});
