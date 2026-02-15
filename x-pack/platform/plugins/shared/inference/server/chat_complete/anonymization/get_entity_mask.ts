/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { generateToken } from '@kbn/anonymization-common';

/**
 * Generates a deterministic mask/token for an anonymized entity.
 *
 * When a per-space salt is provided (via AnonymizationPolicyService),
 * uses HMAC-SHA256 for deterministic, salted tokenization that is stable
 * within a space and prevents cross-space correlation.
 *
 * When no salt is provided (fallback mode), uses the legacy object-hash
 * approach for backwards compatibility with existing behavior.
 *
 * @param entity - The entity to mask (class_name + value, optional field)
 * @param salt - Per-space secret material (optional; from AnonymizationPolicyService)
 */
export function getEntityMask(
  entity: { class_name: string; value: string; field?: string },
  salt?: string
): string {
  if (salt) {
    // Use deterministic HMAC-based tokenization from shared package
    return generateToken(salt, entity.class_name, entity.field ?? entity.class_name, entity.value);
  }

  // Legacy fallback: unsalted object-hash (for when anonymization plugin is unavailable)
  const hash = objectHash({
    value: entity.value,
    class_name: entity.class_name,
  });
  return `${entity.class_name}_${hash}`;
}
