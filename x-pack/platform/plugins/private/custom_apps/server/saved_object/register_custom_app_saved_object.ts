/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup } from '@kbn/core/server';
import { CUSTOM_APP_SAVED_OBJECT_TYPE } from '../../common/constants';

/**
 * The app definition is stored as a JSON string rather than mapped fields. It
 * is an opaque document we only ever read whole, and mapping an
 * agent-authored tree of arbitrary depth would add index churn for no query
 * benefit. This mirrors how dashboards store `panelsJSON`.
 */
const customAppAttributesSchema = schema.object({
  title: schema.string(),
  description: schema.maybe(schema.string()),
  appJSON: schema.string(),
});

export function registerCustomAppSavedObject(core: CoreSetup) {
  core.savedObjects.registerType({
    name: CUSTOM_APP_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'multiple-isolated',
    management: {
      importableAndExportable: true,
      defaultSearchField: 'title',
      icon: 'apps',
      getTitle: (obj) => `Custom app: ${(obj.attributes as { title: string }).title}`,
    },
    mappings: {
      dynamic: false,
      properties: {
        title: { type: 'text' },
        description: { type: 'text' },
        appJSON: { type: 'text', index: false },
      },
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: customAppAttributesSchema.extends({}, { unknowns: 'ignore' }),
          create: customAppAttributesSchema,
        },
      },
    },
  });
}
