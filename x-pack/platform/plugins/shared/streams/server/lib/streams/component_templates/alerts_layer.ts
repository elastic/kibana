/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '@kbn/streams-schema';

/**
 * The base mappings for the `alerts` root stream.
 *
 * @remarks
 * These fields are defined in a component template that is applied to all backing indices of the `alerts` stream.
 * They form the base schema that all alerts will share.
 *
 * @see x-pack/platform/plugins/shared/streams/server/lib/streams/component_templates/logs_layer.ts
 */
export const baseFields: FieldDefinition = {
  '@timestamp': { type: 'date' },
  'event.kind': { type: 'keyword' },
  'kibana.alert.rule.id': { type: 'keyword' },
  'kibana.alert.rule.name': { type: 'keyword' },
  'kibana.alert.rule.type': { type: 'keyword' },
  'kibana.alert.rule.space': { type: 'keyword' },
  'kibana.alert.severity': { type: 'keyword' },
  'kibana.alert.reason': { type: 'match_only_text' },
  'kibana.alert.uuid': { type: 'keyword' },
  'kibana.alert.status': { type: 'keyword' },
};
