/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { significantEventBaseSchema } from '../common_schemas';
import { MAX_ID_LENGTH } from '../constants';

export const discoverySchema = significantEventBaseSchema.extend({
  '@timestamp': z.iso.datetime({ offset: true }),
  kind: z
    .enum(['discovery', 'clearance', 'handled'])
    .describe(
      '"discovery" for an open investigation episode; ' +
        '"clearance" when the episode has recovered; ' +
        '"handled" to stamp the episode as fully processed after the significant event has been written.'
    ),
  discovery_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe(
      'Unique ID for this discovery document version. Auto-generated when omitted. ' +
        'Required for "handled" kind to reference the discovery being stamped as fully processed.'
    ),
  discovered_at: z.iso.datetime({ offset: true }).optional(),
  previous_discovery_id: z.string().max(MAX_ID_LENGTH).optional(),
  processed: z.boolean(),
});

export type Discovery = z.infer<typeof discoverySchema>;
