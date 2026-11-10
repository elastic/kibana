/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { CUSTOM_APP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { customAppModelVersions } from './model_versions';

export const customAppSavedObjectType: SavedObjectsType = {
  name: CUSTOM_APP_SAVED_OBJECT_TYPE,
  indexPattern: ANALYTICS_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  management: {
    icon: 'apps',
    defaultSearchField: 'title',
    displayName: i18n.translate('xpack.customApp.savedObject.displayName', {
      defaultMessage: 'custom app',
    }),
    importableAndExportable: true,
    getTitle: (savedObject) => savedObject.attributes.title,
  },
  // Only what is searched or sorted is mapped. The document is stored but not indexed.
  mappings: {
    dynamic: false,
    properties: {
      title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      description: { type: 'text' },
    },
  },
  modelVersions: customAppModelVersions,
};
