/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import { FLEET_SCHEMA_ID_MAX_LENGTH } from '../../constants';

export const GetRemoteSyncedIntegrationsInfoRequestSchema = {
  params: schema.object({
    outputId: schema.string({
      maxLength: FLEET_SCHEMA_ID_MAX_LENGTH,
      meta: { description: 'The ID of the output' },
    }),
  }),
};
