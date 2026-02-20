/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { flappingSchema as flappingSchemaV1 } from './v1';

export const flappingSchema = flappingSchemaV1.extends({
  enabled: schema.maybe(
    schema.boolean({
      meta: {
        description:
          'Determines whether the rule can enter the flapping state. By default, rules can enter the flapping state.',
      },
    })
  ),
});
