/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChildProcess } from 'child_process';
import { ControlledProgram } from './controlled_program';

export class ExternalProcess implements ControlledProgram {
  constructor(readonly child: ChildProcess) {
    this.pid = child.pid;
  }

  kill(force: boolean = false): void {
    if (force) {
      this.child.kill('SIGKILL');
    } else {
      this.child.kill();
    }
  }

  killed(): boolean {
    return this.child.killed;
  }

  onExit(callback: () => void) {
    this.child.on('exit', callback);
  }

  readonly pid: number;
}
