/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const GetRemoteSyncedIntegrationsInfoRequestSchema = {
  params: schema.object({
    outputId: schema.savedObjectId.warn({
      minLength: 0,
      label: 'fleet.remote_synced_integrations.outputId',
      meta: { description: 'The ID of the output' },
    }),
  }),
};
