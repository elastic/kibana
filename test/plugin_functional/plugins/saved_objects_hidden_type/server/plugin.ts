/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';

export class SavedObjectsHiddenTypePlugin implements Plugin {
  public setup({ savedObjects }: CoreSetup, deps: {}) {
    // example of a SO type that is hidden and importableAndExportable
    savedObjects.registerType({
      name: 'test-hidden-importable-exportable',
      hidden: true,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
        },
      },
      management: {
        importableAndExportable: true,
      },
    });

    // example of a SO type that is hidden and not importableAndExportable
    savedObjects.registerType({
      name: 'test-hidden-non-importable-exportable',
      hidden: true,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
        },
      },
      management: {
        importableAndExportable: false,
      },
    });
  }

  public start() {}
  public stop() {}
}
