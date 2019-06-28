/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class SpaceActions {
  private readonly prefix: string;

  constructor(versionNumber: string) {
    this.prefix = `space:${versionNumber}:`;
  }

  public get manage(): string {
    return `${this.prefix}manage`;
  }
}
