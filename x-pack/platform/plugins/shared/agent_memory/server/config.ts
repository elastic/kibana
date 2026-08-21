/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    writeConfirmation: schema.oneOf([schema.literal('always'), schema.literal('never')], {
      defaultValue: 'always',
    }),
    /** When > 0, fire a capture hook after every N completed conversation rounds. 0 disables the hook. */
    captureEveryNMessages: schema.number({ defaultValue: 0, min: 0, max: 1000 }),
  }),
};

export type AgentMemoryConfig = TypeOf<typeof config.schema>;
