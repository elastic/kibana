/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';

/**
 * Mappings for the action policy saved object.
 * For the full list of mappings, see:
 * https://github.com/elastic/kibana/blob/main/x-pack/plugins/alerting_v2/server/saved_objects/schemas/action_policy_saved_object_attributes/v1.ts
 */
export const actionPolicyMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
    description: { type: 'text' },
    enabled: { type: 'boolean' },
    tags: { type: 'keyword' },
    // NO NEED TO BE INDEXED
    // groupBy is only read from _source. The count_with_group_by telemetry
    // aggregation runs on the `ap_group_by_count` runtime mapping in
    // server/lib/usage/lib/get_action_policy_stats.ts.
    // groupBy: { type: 'keyword' },
    // auth.apiKey is an ESO-encrypted attribute. ESO decrypts from _source,
    // so the ciphertext never needs to be indexed.
    // auth: {
    //   type: 'object',
    //   properties: {
    //     apiKey: { type: 'binary' },
    //   },
    // },
  },
};
