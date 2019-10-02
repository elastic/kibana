/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FilterManager } from 'src/legacy/core_plugins/data/public';

export class SiemFilterManager {
  private filterManager: FilterManager;
  private ignoreUpdate: boolean = false;

  constructor(filterManager: FilterManager) {
    this.filterManager = filterManager;
  }
  public getFilterManager(ignoreUpdate?: boolean) {
    this.ignoreUpdate = ignoreUpdate || this.ignoreUpdate;
    return this.filterManager;
  }

  public setIgnoreUpdate(value: boolean) {
    this.ignoreUpdate = value;
  }

  public getIgnoreUpdate() {
    return this.ignoreUpdate;
  }
}
