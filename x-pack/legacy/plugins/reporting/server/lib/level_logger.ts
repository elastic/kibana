/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type ServerLog = (tags: string[], msg: string) => void;

const trimStr = (toTrim: string) => {
  return typeof toTrim === 'string' ? toTrim.trim() : toTrim;
};

export class LevelLogger {
  private _logger: any;
  private _tags: string[];
  private _isVerbose: boolean;

  public warn: (msg: string, tags?: string[]) => void;

  static createForServer(server: any, tags: string[], isVerbose = false) {
    const serverLog: ServerLog = (tgs: string[], msg: string) => server.log(tgs, msg);
    return new LevelLogger(serverLog, tags, isVerbose);
  }

  constructor(logger: ServerLog, tags: string[], isVerbose: boolean) {
    this._logger = logger;
    this._tags = tags;
    this._isVerbose = isVerbose;

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

  public get isVerbose() {
    return this._isVerbose;
  }

  public clone(tags: string[]) {
    return new LevelLogger(this._logger, [...this._tags, ...tags], this._isVerbose);
  }
}
