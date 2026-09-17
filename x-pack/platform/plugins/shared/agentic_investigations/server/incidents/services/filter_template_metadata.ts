/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetadataFieldValue } from '@kbn/agent-builder-common';

/**
 * Filters a conversation's metadata to only the keys declared by the target template,
 * dropping empty values so the template's own field defaults can apply.
 *
 * Necessary because `client.create` rejects any metadata key not declared in the
 * target template (e.g. `workflow_execution_id` exists on investigations but not
 * incidents), and copying an empty required field would fail validation instead of
 * falling back to the template default.
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
