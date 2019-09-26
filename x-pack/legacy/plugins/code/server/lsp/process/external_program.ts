/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { ChildProcess } from 'child_process';
import { ControlledProgram } from './controlled_program';
import { ServerOptions } from '../../server_options';
import { Logger } from '../../log';

const OOM_SCORE_ADJ = 667;
const OOM_ADJ = 10;

export class ExternalProgram implements ControlledProgram {
  constructor(readonly child: ChildProcess, readonly options: ServerOptions, readonly log: Logger) {
    this.pid = child.pid;
    if (this.options.lsp.oomScoreAdj && process.platform === 'linux') {
      this.adjustOom(this.pid);
    }
    this.log.debug('spawned a child process ' + this.pid);
  }

  kill(force: boolean = false): void {
    if (force) {
      this.child.kill('SIGKILL');
      this.log.info('force killed process ' + this.pid);
    } else {
      this.child.kill();
      this.log.info('killed process ' + this.pid);
    }
  }

  killed(): boolean {
    return this.child.killed;
  }

  onExit(callback: () => void) {
    this.child.on('exit', callback);
  }

  readonly pid: number;

  private adjustOom(pid: number) {
    try {
      fs.writeFileSync(`/proc/${pid}/oom_score_adj`, `${OOM_SCORE_ADJ}\n`);
      this.log.debug(`wrote oom_score_adj of process ${pid} to ${OOM_SCORE_ADJ}`);
    } catch (e) {
      this.log.warn(e);
      try {
        fs.writeFileSync(`/proc/${pid}/oom_adj`, `${OOM_ADJ}\n`);
        this.log.debug(`wrote oom_adj of process ${pid} to ${OOM_ADJ}`);
      } catch (err) {
        this.log.warn(
          'write oom_score_adj and oom_adj file both failed, reduce priority not working'
        );
        this.log.warn(err);
      }
    }
  }
}
