/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';

export class SavedObjectExportTransformsPlugin implements Plugin {
  public setup({ savedObjects, getStartServices }: CoreSetup, deps: {}) {
    const savedObjectStartContractPromise = getStartServices().then(
      ([{ savedObjects: savedObjectsStart }]) => savedObjectsStart
    );

    // example of a SO type that will mutates its properties
    // during the export transform
    savedObjects.registerType({
      name: 'test-export-transform',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
          enabled: {
            type: 'boolean',
          },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        getTitle: (obj) => obj.attributes.title,
        onExport: (ctx, objs) => {
          return objs.map((obj) => ({
            ...obj,
            attributes: {
              ...obj.attributes,
              enabled: false,
            },
          }));
        },
      },
    });

    // example of a SO type that will add additional objects
    // to the export during the export transform
    savedObjects.registerType({
      name: 'test-export-add',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        getTitle: (obj) => obj.attributes.title,
        onExport: async (ctx, objs) => {
          const { getScopedClient } = await savedObjectStartContractPromise;
          const client = getScopedClient(ctx.request);
          const objRefs = objs.map(({ id, type }) => ({ id, type }));
          const depResponse = await client.find({
            type: 'test-export-add-dep',
            hasReference: objRefs,
          });
          return [...objs, ...depResponse.saved_objects];
        },
      },
    });

    // dependency of `test_export_transform_2` that will be included
    // when exporting them
    savedObjects.registerType({
      name: 'test-export-add-dep',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        getTitle: (obj) => obj.attributes.title,
      },
    });

    // example of a SO type that will throw an object-transform-error
    savedObjects.registerType({
      name: 'test-export-transform-error',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        getTitle: (obj) => obj.attributes.title,
        onExport: (ctx, objs) => {
          throw new Error('Error during transform');
        },
      },
    });

    // example of a SO type that will throw an invalid-transform-error
    savedObjects.registerType({
      name: 'test-export-invalid-transform',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        getTitle: (obj) => obj.attributes.title,
        onExport: (ctx, objs) => {
          return objs.map((obj) => ({
            ...obj,
            id: `${obj.id}-mutated`,
          }));
        },
      },
    });

    // example of a SO type that is exportable while being hidden
    savedObjects.registerType({
      name: 'test-actions-export-hidden',
      hidden: true,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
          enabled: {
            type: 'boolean',
          },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        getTitle: (obj) => obj.attributes.title,
      },
    });

    // example of a SO type implementing the `isExportable` API
    savedObjects.registerType<{ enabled: boolean; title: string }>({
      name: 'test-is-exportable',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
          enabled: { type: 'boolean' },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        getTitle: (obj) => obj.attributes.title,
        isExportable: (obj) => {
          if (obj.id === 'error') {
            throw new Error('something went wrong');
          }
          return obj.attributes.enabled === true;
        },
      },
    });

    // example of a SO type with `visibleInManagement: false`
    savedObjects.registerType<{ enabled: boolean; title: string }>({
      name: 'test-not-visible-in-management',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
          enabled: { type: 'boolean' },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        visibleInManagement: false,
      },
    });

    // example of a SO type with `visibleInManagement: true`
    savedObjects.registerType<{ enabled: boolean; title: string }>({
      name: 'test-visible-in-management',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
          enabled: { type: 'boolean' },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        visibleInManagement: true,
      },
    });

    // example of a SO type specifying a display name
    savedObjects.registerType<{ enabled: boolean; title: string }>({
      name: 'test-with-display-name',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
          enabled: { type: 'boolean' },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        displayName: 'my display name',
      },
    });
  }

  public start() {}

  public stop() {}
}
