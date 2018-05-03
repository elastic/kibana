/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { relative } from 'path';
import Rx from 'rxjs/Rx';
import { Command } from 'commander';
import { withProcRunner } from '@kbn/dev-utils';

import {
  getFtrConfig,
  runKibanaServer,
  runEsWithXpack,
  runFtr,
  log,
  KIBANA_FTR_SCRIPT,
  isCliError,
} from './lib';

const SUCCESS_MESSAGE = `

Elasticsearch and Kibana are ready for functional testing. Start the functional tests
in another terminal session by running this command from this directory:

    node ${relative(process.cwd(), KIBANA_FTR_SCRIPT)}

`;

export function fatalErrorHandler(err) {
  log.error('FATAL ERROR');
  log.error(isCliError(err) ? err.message : err);
  process.exit(1);
}

export async function runFunctionTests() {
  try {
    const cmd = new Command('node scripts/functional_tests');

    cmd
      .option(
        '--bail',
        'Stop the functional_test_runner as soon as a failure occurs'
      )
      .option(
        '--kibana-install-dir <path>',
        'Run Kibana from an existing install directory'
      )
      .option(
        '--es-from <from>',
        'Run ES from either source or snapshot [default: snapshot]'
      )
      .parse(process.argv);

    await withProcRunner(async procs => {
      const ftrConfig = await getFtrConfig();

      const es = await runEsWithXpack({ ftrConfig, from: cmd.esFrom });
      await runKibanaServer({
        procs,
        ftrConfig,
        existingInstallDir: cmd.kibanaInstallDir,
      });
      await runFtr({
        procs,
        bail: cmd.bail,
      });

      await procs.stop('kibana');
      await es.cleanup();
    });
  } catch (err) {
    fatalErrorHandler(err);
  }
}

export async function runApiTests() {
  const cmd = new Command('node scripts/functional_tests_api');

  cmd
    .option(
      '--bail',
      'Stop the functional_test_runner as soon as a failure occurs'
    )
    .option(
      '--kibana-install-dir <path>',
      'Run Kibana from an existing install directory'
    )
    .option(
      '--es-from <from>',
      'Run ES from either source or snapshot [default: snapshot]'
    )
    .parse(process.argv);

  try {
    await withProcRunner(async procs => {
      const ftrConfig = await getFtrConfig();

      const es = await runEsWithXpack({ ftrConfig, from: cmd.esFrom });
      await runKibanaServer({
        procs,
        ftrConfig,
        enableUI: true,
        existingInstallDir: cmd.kibanaInstallDir,
      });
      await runFtr({
        procs,
        configPath: require.resolve('../../test/api_integration/config.js'),
        bail: cmd.bail,
      });

      await procs.stop('kibana');
      await es.cleanup();

      // Run SAML specific API integration tests.
      const samlEs = await runEsWithXpack({
        ftrConfig,
        useSAML: true,
        from: cmd.esFrom,
      });
      await runKibanaServer({
        procs,
        ftrConfig,
        enableUI: false,
        useSAML: true,
        existingInstallDir: cmd.kibanaInstallDir,
      });
      await runFtr({
        procs,
        configPath: require.resolve(
          '../../test/saml_api_integration/config.js'
        ),
      });

      await procs.stop('kibana');
      await samlEs.cleanup();
    });
  } catch (err) {
    fatalErrorHandler(err);
  }
}

export async function runFunctionalTestsServer() {
  const cmd = new Command('node scripts/functional_test_server');

  cmd
    .option(
      '--saml',
      'Run Elasticsearch and Kibana with configured SAML security realm',
      false
    )
    .option(
      '--es-from <from>',
      'Run ES from either source or snapshot [default: snapshot]'
    )
    .parse(process.argv);

  const useSAML = cmd.saml;

  try {
    await withProcRunner(async procs => {
      const ftrConfig = await getFtrConfig();
      await runEsWithXpack({ ftrConfig, useSAML, from: cmd.esFrom });
      await runKibanaServer({
        devMode: true,
        procs,
        ftrConfig,
        useSAML,
      });

      // wait for 5 seconds of silence before logging the success message
      // so that it doesn't get burried
      await Rx.Observable.fromEvent(log, 'data')
        .switchMap(() => Rx.Observable.timer(5000))
        .first()
        .toPromise();

      log.info(SUCCESS_MESSAGE);
      await procs.waitForAllToStop();
    });
  } catch (err) {
    fatalErrorHandler(err);
  }
}
