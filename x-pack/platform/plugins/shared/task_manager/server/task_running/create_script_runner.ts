/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fork, type ChildProcess } from 'child_process';
import type { RunContext } from '../task';

export interface CreateScriptRunnerContext extends Omit<RunContext, 'fakeRequest'> {
  path: string;
  apiKey?: string;
}

export function createScriptRunner({ taskInstance, path, apiKey }: CreateScriptRunnerContext) {
  let child: ChildProcess;
  return {
    async run() {
      return new Promise((resolve, reject) => {
        child = fork(path, {
          stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        });

        child.on('message', (msg) => {
          console.log(`[child message]: ${msg}`);
        });

        child.on('error', (err) => {
          console.error(`[child error]: ${err}`);
          reject(err);
        });

        child.send({ action: 'setArg', key: 'params', value: taskInstance.params });
        child.send({ action: 'setArg', key: 'apiKey', value: apiKey });
        child.send({ action: 'run' });

        child.on('exit', (code, signal) => {
          if (code === 0) {
            resolve({});
          } else {
            reject(new Error(`Child exited with code=${code} signal=${signal}`));
          }
        });
      });
    },
    async cancel() {
      if (child && !child.killed) {
        console.log(`*** Cancel requested`);
        child.kill('SIGTERM');
      }
    },
  };
}
