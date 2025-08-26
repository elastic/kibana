/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { CoreSetup } from '@kbn/core/server';
import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import type { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { getEditPath } from '../common/constants';
import { getAllMigrations } from './migrations/saved_object_migrations';
import type { CustomVisualizationMigrations } from './migrations/types';
import { lensItemAttributesSchemaV0 } from './content_management/v0';
import {
  LENS_ITEM_VERSION as LENS_ITEM_VERSION_V1,
  lensItemAttributesSchema as lensItemAttributesSchemaV1,
} from './content_management/v1';

export function setupSavedObjects(
  core: CoreSetup,
  getFilterMigrations: () => MigrateFunctionsObject,
  customVisualizationMigrations: CustomVisualizationMigrations
) {
  core.savedObjects.registerType({
    name: 'lens',
    indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'multiple-isolated',
    convertToMultiNamespaceTypeVersion: '8.0.0',
    management: {
      icon: 'lensApp',
      defaultSearchField: 'title',
      importableAndExportable: true,
      getTitle: (obj: { attributes: { title: string } }) => obj.attributes.title,
      getInAppUrl: (obj: { id: string }) => ({
        path: `/app/lens${getEditPath(obj.id)}`,
        uiCapabilitiesPath: 'visualize_v2.show',
      }),
    },
    migrations: () =>
      getAllMigrations(
        getFilterMigrations(),
        DataViewPersistableStateService.getAllMigrations(),
        customVisualizationMigrations
      ),
    modelVersions: {
      [LENS_ITEM_VERSION_V1]: {
        changes: [
          {
            type: 'mappings_addition',
            addedMappings: {
              version: {
                type: 'integer',
              },
            },
          },
        ],
        schemas: {
          forwardCompatibility: lensItemAttributesSchemaV1.extendsDeep({ unknowns: 'ignore' }),
          create: lensItemAttributesSchemaV0,
        },
      },
    },
    mappings: {
      properties: {
        title: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
        visualizationType: {
          type: 'keyword',
        },
        version: {
          type: 'integer',
        },
        state: {
          dynamic: false,
          properties: {},
        },
      },
    },
  });

  core.savedObjects.registerType({
    name: 'lens-ui-telemetry',
    indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'single',
    mappings: {
      properties: {
        name: {
          type: 'keyword',
        },
        type: {
          type: 'keyword',
        },
        date: {
          type: 'date',
        },
        count: {
          type: 'integer',
        },
      },
    },
  });
}
