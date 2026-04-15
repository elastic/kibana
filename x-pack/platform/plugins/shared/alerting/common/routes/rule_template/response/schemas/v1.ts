/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleResponseSchemaV1 } from '../../../rule/response';

export const ruleTemplateResponseSchema = schema.object({
  id: schema.string({
    meta: {
      description: 'The identifier for the rule.',
    },
  }),
  name: schema.string({
    meta: {
      description: ' The name of the rule.',
    },
  }),
  tags: schema.arrayOf(
    schema.string({
      meta: { description: 'The tags for the rule.' },
    })
  ),
  rule_type_id: schema.string({
    meta: { description: 'The rule type identifier.' },
  }),

  schedule: ruleResponseSchemaV1.getPropSchemas().schedule,
  params: ruleResponseSchemaV1.getPropSchemas().params,

  alert_delay: ruleResponseSchemaV1.getPropSchemas().alert_delay,
  flapping: ruleResponseSchemaV1.getPropSchemas().flapping,
  description: schema.maybe(
    schema.string({
      meta: { description: 'The description of the rule template.' },
    })
  ),
  artifacts: ruleResponseSchemaV1.getPropSchemas().artifacts,
});
