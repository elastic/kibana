/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../types';

type ServerLog = (tags: string[], msg: string) => void;

export class LevelLogger implements Logger {
  private _logger: any;
  private _tags: string[];

  public warn: (msg: string, tags?: string[]) => void;

  static createForServer(server: any, tags: string[]) {
    const serverLog: ServerLog = (tgs: string[], msg: string) => server.log(tgs, msg);
    return new LevelLogger(serverLog, tags);
  }

  constructor(logger: ServerLog, tags: string[]) {
    this._logger = logger;
    this._tags = tags;

    /*
     * This shortcut provides maintenance convenience: Reporting code has been
     * using both .warn and .warning
     */
    this.warn = this.warning.bind(this);
  }

  public error(msg: string, tags: string[] = []) {
    this._logger([...this._tags, ...tags, 'error'], msg);
  }

  public warning(msg: string, tags: string[] = []) {
    this._logger([...this._tags, ...tags, 'warning'], msg);
  }

  public debug(msg: string, tags: string[] = []) {
    this._logger([...this._tags, ...tags, 'debug'], msg);
  }

  public info(msg: string, tags: string[] = []) {
    this._logger([...this._tags, ...tags, 'info'], msg);
  }

  public clone(tags: string[]) {
    return new LevelLogger(this._logger, [...this._tags, ...tags]);
  }
}
