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
export declare class AdHocTaskCounter {
  /**
   * Gets the number of created tasks.
   */
  get count(): number;
  private _count;
  constructor();
  increment(by?: number): void;
  reset(): void;
}
