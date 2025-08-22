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

      if (connectorType === '.oauth_google_drive' && subaction === 'query') {
        return z
          .object({
            query: z.string(),
          })
          .describe('A text query that will be used to search files by name or content');
      }

      if (connectorType === '.oauth_google_drive' && subaction === 'download') {
        return z
          .object({
            fileId: z.string(),
          })
          .describe(
            'FileId that will be passed to Google Drive API to get the content of the file'
          );
      }

      throw new Error('Unsupported connectorType and/or subaction');
    },
  };
}
