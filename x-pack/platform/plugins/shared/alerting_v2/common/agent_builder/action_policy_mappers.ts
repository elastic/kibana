/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyAttachmentData, CreateActionPolicyData } from '@kbn/alerting-v2-schemas';

/**
 * Maps partial action policy attachment data to the API request payload,
 * filling in required defaults for missing fields. Used by both the canvas
 * save/update flow and the server-side validation operation.
 */
export const attachmentDataToActionPolicyPayload = (
  data: Partial<ActionPolicyAttachmentData>
): CreateActionPolicyData => ({
  name: data.name ?? '',
  description: data.description ?? '',
  type: data.type ?? 'global',
  destinations: data.destinations ?? [],
  ...(data.ruleId !== undefined ? { ruleId: data.ruleId ?? undefined } : {}),
  ...(data.matcher !== undefined ? { matcher: data.matcher ?? undefined } : {}),
  ...(data.groupBy !== undefined ? { groupBy: data.groupBy ?? undefined } : {}),
  ...(data.tags !== undefined ? { tags: data.tags ?? undefined } : {}),
  ...(data.groupingMode !== undefined ? { groupingMode: data.groupingMode ?? undefined } : {}),
  ...(data.throttle !== undefined ? { throttle: data.throttle ?? undefined } : {}),
});
