/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { FieldLinkIndexes } from '../../common/utils/field_link_resolution';
import { resolveDefinitionForLegacyField } from '../../common/utils/field_link_resolution';

/**
 * Deterministic fingerprint of a space's **active v1 → v2 field links**, stored
 * on the `legacyFieldValuesReconciled` configure marker. Derived only from the
 * sorted configured v1 `key`/`type` pairs and, for each, the resolved
 * definition's id/name/parsed type (or the resolution failure status) — never
 * labels or values. Any change to the configured field set, to a link target,
 * or to a field's resolvability changes the fingerprint, which makes the stored
 * marker stale and reschedules reconciliation (plan addendum A3: removing and
 * re-adding a v1 field cannot leave old cases outside the invariant).
 */
export const computeActiveLinkFingerprint = (
  configuredFields: Array<{ key: string; type: string }>,
  indexes: FieldLinkIndexes
): string => {
  const lines = configuredFields.map(({ key, type }) => {
    const resolution = resolveDefinitionForLegacyField({ key, type }, indexes);
    if (resolution.status === 'resolved') {
      const { definition } = resolution.link;
      return `${key}|${type}|resolved|${definition.fieldDefinitionId}|${definition.name}|${resolution.storageKey}`;
    }
    return `${key}|${type}|${resolution.status}|${resolution.reason}`;
  });

  return createHash('sha256').update(lines.sort().join('\n')).digest('hex');
};
