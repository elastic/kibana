/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFieldMapping } from '@kbn/core-saved-objects-server';

/**
 * Painless source for the index-time scripted `caseId` keyword shared by
 * `cases-comments` and `cases-attachments`. Reads `_source.references` and
 * emits the first `cases`-typed reference id. Single-emit (cases SOs reference
 * at most one parent case) and short-circuits on the first match.
 */
export const CASE_ID_SCRIPT_SOURCE = `
  if (params._source != null && params._source.references instanceof List) {
    for (def ref : params._source.references) {
      if (ref instanceof Map && ref.type == 'cases' && ref.id != null) {
        emit(ref.id);
        return;
      }
    }
  }
`;

/**
 * Canonical `caseId` mapping. Must be declared identically at the top-level
 * `mappings.properties.caseId` AND inside the model version's `addedMappings`
 * that introduces the field — Kibana's `validateAddedMappings` cross-checks
 * the two and refuses to start if they diverge.
 */
export const CASE_ID_FIELD_MAPPING: SavedObjectsFieldMapping = {
  type: 'keyword',
  on_script_error: 'continue',
  script: { source: CASE_ID_SCRIPT_SOURCE },
};
