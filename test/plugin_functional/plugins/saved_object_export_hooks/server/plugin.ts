/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Plugin, CoreSetup } from 'kibana/server';

export class SavedObjectExportHooksPlugin implements Plugin {
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
  }

  public start() {}
  public stop() {}
}
