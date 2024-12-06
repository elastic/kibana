/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  AGENT_TYPE_EPHEMERAL,
  AGENT_TYPE_PERMANENT,
  AGENT_TYPE_TEMPORARY,
} from '../../../common/constants';

export const AgentTypeSchema = schema.oneOf([
  schema.literal(AGENT_TYPE_EPHEMERAL),
  schema.literal(AGENT_TYPE_PERMANENT),
  schema.literal(AGENT_TYPE_TEMPORARY),
]);

export const NewAgentActionSchema = schema.oneOf([
  schema.object({
    type: schema.oneOf([
      schema.literal('UNENROLL'),
      schema.literal('UPGRADE'),
      schema.literal('POLICY_REASSIGN'),
    ]),
    data: schema.maybe(schema.any()),
    ack_data: schema.maybe(schema.any()),
  }),
  schema.object({
    type: schema.oneOf([schema.literal('SETTINGS')]),
    data: schema.object({
      log_level: schema.nullable(
        schema.oneOf([
          schema.literal('debug'),
          schema.literal('info'),
          schema.literal('warning'),
          schema.literal('error'),
        ])
      ),
    }),
  }),
]);
