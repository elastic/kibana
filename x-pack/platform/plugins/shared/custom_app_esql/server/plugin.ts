/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { CustomAppServerSetup } from '@kbn/custom-app-plugin/server';
import { esqlEditorCapability } from '../common/esql_editor';

interface SetupDeps {
  customApp: CustomAppServerSetup;
}

/** Adds the ES|QL editor to what custom apps can be made of, so that apps that use it can be saved. */
export class CustomAppEsqlPlugin implements Plugin<void, void, SetupDeps> {
  setup(_core: CoreSetup, { customApp }: SetupDeps) {
    customApp.registerCapability(esqlEditorCapability);
  }

  start() {}
}
