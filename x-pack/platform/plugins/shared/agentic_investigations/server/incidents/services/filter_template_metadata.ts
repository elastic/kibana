/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetadataFieldValue } from '@kbn/agent-builder-common';

/**
 * Narrows one conversation's metadata to the keys another template declares.
 *
 * Load-bearing. `client.create` runs `validateMetadataUpdate` (agent_builder
 * templates/validation.ts:213), which throws:
 *   `field "<key>" is not declared in template "<templateId>"`
 * for any undeclared key. The `investigation` template declares
 * `workflow_execution_id`; `incident` does not. Spreading an investigation's
 * metadata straight into an incident create is therefore a guaranteed 400.
 *
 * Empty values are dropped rather than copied: `validateMetadataUpdate` enforces
 * `required` on every key *present* in the update, so copying an empty required
 * field (e.g. `status`) would fail, while omitting it lets the template's own
 * default ('open') apply.
 *
 * Note: The overlap between the two templates is computed from `declaredFields` at
 * runtime rather than being hardcoded. This keeps the filter correct for free when
 * either template gains or loses fields.
 *
 * Caveat: serialize/deserialize for TEXT, SELECT, and TEXT_ARRAY fields is
 * effectively identity (serialize.ts:23-53), so the round trip here is lossless
 * for today's field types. A future TOGGLE or NUMBER field would not be lossless —
 * add explicit tests if either template adds one.
 */
export const filterMetadataToTemplateFields = ({
  metadata,
  declaredFields,
  exclude = [],
}: {
  /** The source conversation's metadata, already deserialized by `client.get`. */
  metadata: Record<string, MetadataFieldValue> | undefined;
  /** Keys declared by the *target* template's `fields` object. */
  declaredFields: readonly string[];
  /** Keys to omit even if declared. Used to exclude fields set separately (e.g. linked_investigations). */
  exclude?: readonly string[];
}): Record<string, MetadataFieldValue> => {
  if (!metadata) {
    return {};
  }

  const allowed = new Set(declaredFields);
  const excluded = new Set(exclude);

  return Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) => {
      if (!allowed.has(key) || excluded.has(key)) {
        return false;
      }
      // Drop empty values so the target template's required-field defaults can apply.
      if (value === '' || value === null || value === undefined) {
        return false;
      }
      if (Array.isArray(value) && value.length === 0) {
        return false;
      }
      return true;
    })
  );
};
