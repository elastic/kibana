/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { TaggingUsageData, ByTypeTaggingUsageData } from './types';

const perTypeSchema: MakeSchemaFrom<ByTypeTaggingUsageData> = {
  usedTags: { type: 'integer', _meta: { description: 'Count of tags used' } },
  taggedObjects: { type: 'integer', _meta: { description: 'Count of Saved Objects tagged' } },
};

export const tagUsageCollectorSchema: MakeSchemaFrom<TaggingUsageData> = {
  usedTags: { type: 'integer' },
  taggedObjects: { type: 'integer' },

  types: {
    dashboard: perTypeSchema,
    lens: perTypeSchema,
    visualization: perTypeSchema,
    map: perTypeSchema,
    search: perTypeSchema,
    'osquery-pack': perTypeSchema,
    'osquery-pack-asset': perTypeSchema,
    'osquery-saved-query': perTypeSchema,
    alerting_rule_template: perTypeSchema,
    slo_template: perTypeSchema,
  },
};
