/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerFacade } from '../../types';

const trimStr = (toTrim: string) => {
  return typeof toTrim === 'string' ? toTrim.trim() : toTrim;
};

export class LevelLogger {
  private _logger: any;
  private _tags: string[];

  public warn: (msg: string, tags?: string[]) => void;

  static createForServer(server: ServerFacade, tags: string[]) {
    const serverLog: ServerFacade['log'] = (tgs: string[], msg: string) => server.log(tgs, msg);
    return new LevelLogger(serverLog, tags);
  }

  constructor(logger: ServerFacade['log'], tags: string[]) {
    this._logger = logger;
    this._tags = tags;

    /*
     * This shortcut provides maintenance convenience: Reporting code has been
     * using both .warn and .warning
     */
    this.warn = this.warning.bind(this);
  }

  public error(err: string | Error, tags: string[] = []) {
    this._logger([...this._tags, ...tags, 'error'], err);
  }

  public warning(msg: string, tags: string[] = []) {
    this._logger([...this._tags, ...tags, 'warning'], trimStr(msg));
  }

  public debug(msg: string, tags: string[] = []) {
    this._logger([...this._tags, ...tags, 'debug'], trimStr(msg));
  }

  public info(msg: string, tags: string[] = []) {
    this._logger([...this._tags, ...tags, 'info'], trimStr(msg));
  }

  public clone(tags: string[]) {
    return new LevelLogger(this._logger, [...this._tags, ...tags]);
  }
}
