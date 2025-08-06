/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export interface SchemaRegistry {
  getSubactionSchema({
    connectorType,
    subaction,
  }: {
    connectorType: string;
    subaction: string;
  }): z.ZodObject<any>;
}

export function createOneChatCompatibleConnectorRegistry(): SchemaRegistry {
  return {
    getSubactionSchema({ connectorType, subaction }) {
      if (connectorType === '.hello-world' && subaction === 'weather') {
        return z
          .object({
            city: z.string(),
          })
          .describe('City to ask about the weather for');
      }

      throw new Error('Unsupported connectorType and/or subaction');
    },
  };
}
