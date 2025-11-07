/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from '@kbn/core/public';

export class MaintenanceWindowsPublicPlugin implements Plugin<{}, {}, {}, {}> {
  constructor() {}

  public setup() {
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
