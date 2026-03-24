/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { type Template } from '../../../common/types/domain/template/latest';
import { CASE_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';

const mappings = {
  dynamic: false,
  properties: {
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
    // NOTE: yaml-based template definition
    definition: {
      type: 'text',
    },
    // NOTE: other timestamp fields are provided by the SO api / model itself
    deletedAt: {
      type: 'date',
    },
    // Optional fields - not indexed due to dynamic: false, but needed for type checking
    description: {
      type: 'text',
    },
    tags: {
      type: 'keyword',
    },
    author: {
      type: 'keyword',
    },
    usageCount: {
      type: 'integer',
    },
    fieldCount: {
      type: 'integer',
    },
    fieldNames: {
      type: 'keyword',
    },
    lastUsedAt: {
      type: 'date',
    },
    isDefault: {
      type: 'boolean',
    },
    isLatest: {
      type: 'boolean',
    },
  },
} as const;

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
  mappings,
};

// NOTE: maintain type "connection" with Domain Schema
mappings.properties satisfies Record<keyof Template, unknown>;
