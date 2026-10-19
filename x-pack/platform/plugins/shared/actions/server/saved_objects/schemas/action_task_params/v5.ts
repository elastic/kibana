/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { actionTaskParamsSchema as actionTaskParamsSchemaV4 } from './v4';

export const actionTaskParamsSchema = actionTaskParamsSchemaV4.extends({
  // The user `apiKey` was minted for, captured by the enqueuer (e.g. the rule's API key owner).
  // Bound to the execution fake request so `getCurrentUser` attributes the connector run to that
  // user: a UIAM API key authenticates as the key itself, not as the user who created it.
  userProfileId: schema.maybe(schema.string()),
  userName: schema.maybe(schema.string()),
});
