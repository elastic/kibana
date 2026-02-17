/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const MAX_MUTE_UNMUTE_INSTANCES = 100;

export const bulkMuteUnmuteAlertsParamsSchema = schema.object({
  rules: schema.arrayOf(
    schema.object({
      id: schema.string(),
      alertInstanceIds: schema.arrayOf(schema.string(), { maxSize: MAX_MUTE_UNMUTE_INSTANCES }),
    }),
    { maxSize: MAX_MUTE_UNMUTE_INSTANCES }
  ),
});
