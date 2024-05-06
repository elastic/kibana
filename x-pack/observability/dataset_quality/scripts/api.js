/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
const { times } = require('lodash');
const yargs = require('yargs');
const path = require('path');
const childProcess = require('child_process');
const { REPO_ROOT } = require('@kbn/repo-info');

const { argv } = yargs(process.argv.slice(2))
  .option('server', {
    default: false,
    type: 'boolean',
    description: 'Only start ES and Kibana',
  })
  .option('runner', {
    default: false,
    type: 'boolean',
    description: 'Only run tests',
  })
  .option('grep', {
    alias: 'spec',
    type: 'string',
    description: 'Specify the specs to run',
  })
  .option('grep-files', {
    alias: 'files',
    type: 'array',
    string: true,
    description: 'Specify the files to run',
  })
  .option('times', {
    type: 'number',
    description: 'Repeat the test n number of times',
  })
  .check((argv) => {
    const { inspect, runner } = argv;
    if (inspect && !runner) {
      throw new Error('--inspect can only be used with --runner');
    } else {
      return true;
    }
  })
  .help();

const { server, runner, grep, grepFiles } = argv;

const license = 'basic';

let ftrScript = 'functional_tests';
if (server) {
  ftrScript = 'functional_tests_server';
} else if (runner) {
  ftrScript = 'functional_test_runner';
}

const cmd = [
  'node',
  `${REPO_ROOT}/scripts/${ftrScript}`,
  ...(grep ? [`--grep "${grep}"`] : []),
  `--config ${REPO_ROOT}/x-pack/test/dataset_quality_api_integration/${license}/config.ts`,
].join(' ');

console.log(`Running: "${cmd}"`);

function runTests() {
  childProcess.execSync(cmd, {
    cwd: path.join(__dirname),
    stdio: 'inherit',
    env: {
      ...process.env,
      DATASET_QUALITY_TEST_GREP_FILES: JSON.stringify(grepFiles),
    },
  });
}

if (argv.times) {
  const runCounter = { succeeded: 0, failed: 0, remaining: argv.times };
  let exitStatus = 0;
  times(argv.times, () => {
    try {
      runTests();
      runCounter.succeeded++;
    } catch (e) {
      exitStatus = 1;
      runCounter.failed++;
    }
    runCounter.remaining--;
    if (argv.times > 1) {
      console.log(runCounter);
    }
  });
  process.exit(exitStatus);
} else {
  runTests();
}
