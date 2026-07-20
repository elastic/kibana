/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fork, type ChildProcess } from 'node:child_process';

export interface RunnerResponse {
  ok?: boolean;
  error?: string;
  harnessError?: string;
  warnings?: string[];
  codeGenerationBlocked?: boolean;
}

const HARDENED_RUNNER_PATH = require.resolve('./vega_validator_hardened_runner.cjs');
const REQUEST_TIMEOUT_MS = 15_000;
const STOP_TIMEOUT_MS = 5_000;

export const startHardenedRunner = ({
  workerPath,
  nodeEnv = process.env.NODE_ENV,
}: {
  workerPath: string;
  nodeEnv?: string;
}): ChildProcess =>
  fork(HARDENED_RUNNER_PATH, {
    execArgv: ['--disallow-code-generation-from-strings'],
    env: {
      ...process.env,
      NODE_ENV: nodeEnv,
      VEGA_VALIDATOR_WORKER_PATH: workerPath,
    },
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });

export const requestRunner = <Response extends RunnerResponse>(
  runner: ChildProcess,
  message: object
): Promise<Response> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      runner.off('error', onError);
      runner.off('exit', onExit);
      runner.off('message', onMessage);
    };
    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };
    const onError = (error: Error) => fail(error);
    const onExit = (code: number | null, signal: NodeJS.Signals | null) =>
      fail(new Error(`Hardened runner exited before responding (code=${code}, signal=${signal})`));
    const onMessage = (response: Response) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (response.harnessError) {
        reject(new Error(response.harnessError));
        return;
      }
      resolve(response);
    };
    const timer = setTimeout(
      () => fail(new Error(`Hardened runner did not respond within ${REQUEST_TIMEOUT_MS}ms`)),
      REQUEST_TIMEOUT_MS
    );

    runner.once('error', onError);
    runner.once('exit', onExit);
    runner.once('message', onMessage);
    runner.send(message, (error) => {
      if (error) {
        fail(error);
      }
    });
  });

export const stopHardenedRunner = async (runner: ChildProcess): Promise<void> => {
  if (!runner.connected || runner.exitCode !== null || runner.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    const forceStop = setTimeout(() => runner.kill('SIGKILL'), STOP_TIMEOUT_MS);
    const giveUp = setTimeout(resolve, STOP_TIMEOUT_MS + 2_000);
    runner.once('exit', () => {
      clearTimeout(forceStop);
      clearTimeout(giveUp);
      resolve();
    });
    runner.once('error', () => runner.kill('SIGKILL'));
    runner.send({ type: 'stop' }, (error) => {
      if (error) {
        runner.kill('SIGKILL');
      }
    });
  });
};
