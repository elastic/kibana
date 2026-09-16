/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONVERSATION_ID_MAX_LENGTH } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod/v4';

// Duplicated from proposals/routes/shared.ts rather than imported cross-entity.
// Two words of duplication beat a cross-entity import that violates the per-entity
// directory boundary, and beat promoting a route-config literal into common/.
export const INTERNAL_ACCESS = 'internal' as const;

export const incidentIdParamsSchema = z.object({
  id: z.string().min(1).max(CONVERSATION_ID_MAX_LENGTH),
});
