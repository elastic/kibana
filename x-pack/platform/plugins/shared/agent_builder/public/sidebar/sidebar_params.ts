/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Params schema for the sidebar app.
 * Defines serializable params that are persisted to localStorage.
 *
 * This is in a separate file from the component so it can be loaded eagerly
 * during plugin setup, while the component is lazy-loaded.
 */
export const getParamsSchema = () =>
  z.object({
    sessionTag: z.string().default('default'),
    agentId: z.string().optional(),
    initialMessage: z.string().optional(),
    autoSendInitialMessage: z.boolean().default(false),
    newConversation: z.boolean().optional(),
  });

export type SidebarParams = z.infer<ReturnType<typeof getParamsSchema>>;
