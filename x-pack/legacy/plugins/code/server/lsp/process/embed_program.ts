/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventEmitter } from 'events';
import { ControlledProgram } from './controlled_program';
import { Logger } from '../../log';

let globalPid = 0;

export abstract class EmbedProgram implements ControlledProgram {
  private eventEmitter = new EventEmitter();
  private _killed: boolean = false;
  protected constructor(readonly log: Logger) {
    this.pid = globalPid++;
  }

  readonly pid: number;

  kill(force?: boolean): void {
    this.stop().then(() => {
      this.log.debug('embed program stopped');
      this._killed = true;
      this.eventEmitter.emit('exit');
    });
  }

  killed(): boolean {
    return this._killed;
  }

  onExit(callback: () => void) {
    this.eventEmitter.on('exit', callback);
  }

  abstract async stop(): Promise<void>;
  abstract async start(): Promise<void>;
}
