/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ingestEventsResponseSchema = schema.object(
  {
    ok: schema.boolean({
      meta: {
        description: 'Indicates the ingress request was accepted for processing.',
      },
    }),
  },
  { meta: { id: 'ingest_events_response' } }
);
