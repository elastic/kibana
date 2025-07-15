/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { CASE_ID_INCREMENTER_SAVED_OBJECT } from '../../common/constants';

export const caseIdIncrementerSavedObjectType: SavedObjectsType = {
  name: CASE_ID_INCREMENTER_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      last_id: {
        type: 'keyword',
      },
      '@timestamp': {
        type: 'date',
      },
      updated_at: {
        type: 'date',
      },
    },
  },
};
