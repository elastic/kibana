/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { defineAlertActionType } from '../define';

export const tagActionType = defineAlertActionType({
  id: 'tag',
  description: 'Updates tags on an alert.',
  bodySchema: z.object({
    tags: z.array(z.string()).describe('List of tags to update on the alert.'),
  }),
  esMappings: {
    tags: { type: 'keyword' },
  },
});
