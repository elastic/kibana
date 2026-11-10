/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyAttachmentData, CreateActionPolicyData } from '@kbn/alerting-v2-schemas';
import { normalizeMatcher } from './normalize_matcher';

/**
 * Maps partial action policy attachment data to the API request payload,
 * filling in required defaults for missing fields. Used by both the canvas
 * save/update flow and the server-side validation operation.
 */
export const attachmentDataToActionPolicyPayload = (
  data: Partial<ActionPolicyAttachmentData>
): CreateActionPolicyData => {
  const matcher = normalizeMatcher(data.matcher);

  return {
    name: data.name ?? '',
    destinations: data.destinations ?? [],
    ...(data.description ? { description: data.description } : {}),
    ...(matcher ? { matcher } : {}),
    ...(data.grouping !== undefined ? { grouping: data.grouping } : {}),
    ...(data.throttle !== undefined ? { throttle: data.throttle } : {}),
  };
};
