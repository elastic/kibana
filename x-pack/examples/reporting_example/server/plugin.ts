/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup } from 'src/core/server';
import { ReportingExampleLocatorDefinition } from '../common';

import { SetupDeps } from './types';

export class ReportingExampleServerPlugin implements Plugin {
  setup(coreSetup: CoreSetup, { share }: SetupDeps) {
    share.url.locators.create(new ReportingExampleLocatorDefinition());
  }
  start() {}
}
