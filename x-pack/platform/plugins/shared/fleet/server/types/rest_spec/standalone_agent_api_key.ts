/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { FLEET_SCHEMA_NAME_MAX_LENGTH } from '../../constants';

export const PostStandaloneAgentAPIKeyRequestSchema = {
  body: schema.object({
    name: schema.displayName.warn({
      minLength: 0,
      maxLength: FLEET_SCHEMA_NAME_MAX_LENGTH,
      label: 'fleet.standalone_agent_api_key.name',
    }),
  }),
};
