/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Keeps track of how many tasks have been created.
 *
 * @export
 * @class AdHocTaskCounter
 *
 */
export class AdHocTaskCounter {
  /**
   * Gets the number of created tasks.
   */
  public get count() {
    return this._count;
  }

  private _count: number;

  constructor() {
    this._count = 0;
  }

  public increment(by: number = 1) {
    this._count += by;
  }

  public reset() {
    this._count = 0;
  }
}
