/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export declare class Poller {
  constructor(options: any);

  public start(): void;
  public stop(): void;
  public isRunning(): boolean;
  public getPollFrequency(): number;
}
