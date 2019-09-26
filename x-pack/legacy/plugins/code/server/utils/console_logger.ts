/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable no-console */

import { Logger } from '../log';

export class ConsoleLogger extends Logger {
  constructor() {
    // @ts-ignore
    super(undefined);
  }

  public info(msg: string | any) {
    console.info(msg);
  }

  public error(msg: string | any) {
    console.error(msg);
  }

  public log(message: string): void {
    this.info(message);
  }

  public debug(msg: string | any) {
    console.debug(msg);
  }

  public warn(msg: string | any): void {
    console.warn(msg);
  }

  public stdout(msg: string | any) {
    console.info(msg);
  }

  public stderr(msg: string | any) {
    console.error(msg);
  }
}
