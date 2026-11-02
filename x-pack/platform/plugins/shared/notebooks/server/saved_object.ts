/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { APP_ID, APP_ROUTE, NOTEBOOK_SAVED_OBJECT_TYPE } from '../common/constants';
import { notebookAttributesSchema, type StoredNotebookAttributes } from './schema';

const V1_FIELDS = ['title', 'description', 'cellOrder', 'cells'];

export const notebookSavedObjectType: SavedObjectsType<StoredNotebookAttributes> = {
  name: NOTEBOOK_SAVED_OBJECT_TYPE,
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  management: {
    icon: 'notebookApp',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle: ({ attributes }) => attributes.title,
    getInAppUrl: ({ id }) => ({
      path: `${APP_ROUTE}/view/${encodeURIComponent(id)}`,
      uiCapabilitiesPath: `${APP_ID}.show`,
    }),
  },
  mappings: {
    dynamic: false,
    properties: {
      title: { type: 'text' },
      description: { type: 'text' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        // Picks top-level fields only so a rollback can still read cells written by a newer version.
        forwardCompatibility: (attributes) => pick(attributes, V1_FIELDS),
        create: notebookAttributesSchema,
      },
    },
  },
};
