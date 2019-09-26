/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkAdapter } from '../adapters/framework/default';

export class FrameworkLib {
  constructor(private readonly adapter: FrameworkAdapter) {}

  public getSetting(setting: 'encryptionKey'): string {
    return this.adapter.getSetting(`xpack.fleet.${setting}`);
  }
}
