/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_WORKFLOW_TAGS } from '../../common/technical_rule_data_field_names';

export const UPDATE_TAGS_SCRIPT = `
  // --- Step 1: Ensure list exists ---
  // If the tags field is not a list (e.g., null or wrong type),
  // initialize it as a new, empty list.

  if (!(ctx._source['${ALERT_WORKFLOW_TAGS}'] instanceof List)) {
    ctx._source['${ALERT_WORKFLOW_TAGS}'] = new ArrayList();
  }
      
  // --- Step 2: Remove ---
  // Check if parameter is a valid list before removing

  if (params.remove instanceof List) {
    ctx._source['${ALERT_WORKFLOW_TAGS}'].removeIf(tag -> params.remove.contains(tag));
  }

  // --- Step 3: Add ---
  // Check if parameter is a valid list before adding

  if (params.add instanceof List) {
    for (String tagToAdd : params.add) {
      // Add the new tag only if it's not already in the list
      if (!ctx._source['${ALERT_WORKFLOW_TAGS}'].contains(tagToAdd)) {
        ctx._source['${ALERT_WORKFLOW_TAGS}'].add(tagToAdd);
      }
    }
  }
`;

export const getBulkUpdateTagsPainlessScript = (
  add?: string[] | null,
  remove?: string[] | null
) => {
  return {
    source: UPDATE_TAGS_SCRIPT,
    lang: 'painless',
    params: { add: add ?? [], remove: remove ?? [] },
  };
};
