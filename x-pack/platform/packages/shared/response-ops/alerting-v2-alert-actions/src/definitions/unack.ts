/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { defineAlertActionType } from '../define';

export const unackActionType = defineAlertActionType({
  id: 'unack',
  description: 'Removes acknowledgement from an alert.',
  bodySchema: z.object({
    episode_id: z.string().describe('The episode identifier for the alert to unacknowledge.'),
  }),
  esMappings: {
    episode_id: { type: 'keyword' },
  },
});
