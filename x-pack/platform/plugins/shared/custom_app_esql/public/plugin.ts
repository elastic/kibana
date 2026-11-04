/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { CustomAppPublicSetup } from '@kbn/custom-app-plugin/public';
import { esqlEditorCapability } from '../common/esql_editor';

interface SetupDeps {
  customApp: CustomAppPublicSetup;
}

/** Adds the ES|QL editor to what custom apps can be made of. */
export class CustomAppEsqlPlugin implements Plugin<void, void, SetupDeps> {
  setup(_core: CoreSetup, { customApp }: SetupDeps) {
    customApp.registerCapability<typeof esqlEditorCapability>({
      manifest: esqlEditorCapability,
      view: () =>
        import('./esql_editor_view').then(({ EsqlEditorView }) => ({ default: EsqlEditorView })),
    });
  }

  start() {}
}
