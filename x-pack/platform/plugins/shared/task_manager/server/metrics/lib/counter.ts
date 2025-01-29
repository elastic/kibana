/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class Counter {
  private count = 0;

  public initialCount(): number {
    return 0;
  }

  public get(): number {
    return this.count;
  }

  public increment() {
    this.count++;
  }

  public reset() {
    this.count = 0;
  }
}
