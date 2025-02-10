/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SemVer from 'semver/classes/semver';

export interface IVersion {
  setup(version: string): void;
  getCurrentVersion(): SemVer;
  getMajorVersion(): number;
  getNextMajorVersion(): number;
  getPrevMajorVersion(): number;
}

export class Version implements IVersion {
  private version!: SemVer;

  public setup(version: string) {
    this.version = new SemVer(version);
  }

  public getCurrentVersion() {
    return this.version;
  }

  public getMajorVersion() {
    return this.version?.major;
  }

  public getNextMajorVersion() {
    return this.version?.major + 1;
  }

  public getPrevMajorVersion() {
    return this.version?.major - 1;
  }
}

export const versionService = new Version();
