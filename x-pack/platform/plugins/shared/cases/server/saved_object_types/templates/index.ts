/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';

/**
 * The comments in the mapping indicate the additional properties that are stored in Elasticsearch but are not indexed.
 * Remove these comments when https://github.com/elastic/kibana/issues/152756 is resolved.
 */

export const caseTemplateSavedObjectType: SavedObjectsType = {
  name: CASE_TEMPLATE_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: {
    dynamic: false,
    properties: {
      // this should be used to identify individual templates, not the _id as we are storing revisions for all the templates.
      templateId: {
        type: 'keyword',
      },
      name: {
        type: 'keyword',
      },
      templateVersion: {
        type: 'integer',
      },
      owner: {
        type: 'keyword',
      },
      // yaml template definition
      definition: {
        type: 'text',
      },
      deletedAt: {
        type: 'date',
      },
    },
  },
};
