/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import { MAX_RUN_LIMIT, MIN_RUN_LIMIT } from '../../../common';

export const RUN_QUOTA_SETTINGS_SO_TYPE = 'significant-events-run-quota-settings';

/**
 * A single, deployment-wide document holding the daily run limits. Global rather
 * than per-space for the same reason the maintenance state is: the workflows
 * being capped are installed once at the global scope, so a per-space number
 * could not be enforced. The id matches the type name — there is only ever one
 * document.
 */
export const RUN_QUOTA_SETTINGS_SO_ID = 'significant-events-run-quota-settings';

const runLimitSchemaV1 = schema.object({
  enabled: schema.boolean(),
  max: schema.number({ min: MIN_RUN_LIMIT, max: MAX_RUN_LIMIT }),
});

/**
 * Groups are stored as an open map rather than a closed object so an older node
 * can persist the document written by a newer one that knows about a group it
 * does not. Readers fill unknown groups from the defaults.
 */
const runQuotaSettingsAttributesV1 = schema.object({
  timezone: schema.string({ maxLength: 64 }),
  limits: schema.recordOf(schema.string({ maxLength: 64 }), runLimitSchemaV1),
  updatedAt: schema.maybe(schema.string({ maxLength: 64 })),
  updatedBy: schema.maybe(schema.string({ maxLength: 1024 })),
});

export type RunQuotaSettingsAttributes = TypeOf<typeof runQuotaSettingsAttributesV1>;

export const getRunQuotaSettingsSavedObjectType = (): SavedObjectsType => ({
  name: RUN_QUOTA_SETTINGS_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    // Nothing is ever queried by field — the document is only ever fetched by id.
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: runQuotaSettingsAttributesV1.extends({}, { unknowns: 'ignore' }),
        create: runQuotaSettingsAttributesV1,
      },
    },
  },
});
