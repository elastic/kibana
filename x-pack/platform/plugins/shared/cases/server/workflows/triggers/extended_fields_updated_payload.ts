/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH } from '../../../common/constants';
import { diffExtendedFields } from '../../../common/utils/template_fields';
import type { ExtendedFieldsUpdatedPayload } from '../../../common/workflows/triggers';

/**
 * Builds the payload for the `cases.extendedFieldsUpdated` trigger.
 *
 * Returns `undefined` when nothing changed — the caller must not emit in that case.
 *
 * Truncation policy: values longer than MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH are cut.
 * Keys are never dropped from either map — an absent key is the wire signal for added/removed.
 * Keys that are truncated in either map are listed in `truncatedFields` (deduped and sorted).
 */
export const buildExtendedFieldsUpdatedPayload = ({
  owner,
  caseId,
  previousExtendedFields,
  extendedFields,
}: {
  owner: string;
  caseId: string;
  previousExtendedFields: Record<string, unknown> | null | undefined;
  extendedFields: Record<string, unknown> | null | undefined;
}): ExtendedFieldsUpdatedPayload | undefined => {
  const diff = diffExtendedFields(previousExtendedFields, extendedFields);

  if (diff.changedFields.length === 0) {
    return undefined;
  }

  const truncatedFieldsSet = new Set<string>();
  const cap = MAX_WORKFLOW_TRIGGER_EXTENDED_FIELD_VALUE_LENGTH;

  const truncateMap = (map: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(map)) {
      if (value.length > cap) {
        out[key] = value.slice(0, cap);
        truncatedFieldsSet.add(key);
      } else {
        out[key] = value;
      }
    }
    return out;
  };

  const truncatedExtendedFields = truncateMap(diff.extendedFields);
  const truncatedPreviousExtendedFields = truncateMap(diff.previousExtendedFields);
  const truncatedFields = Array.from(truncatedFieldsSet).sort();

  return {
    owner,
    caseId,
    changedFields: diff.changedFields,
    extendedFields: truncatedExtendedFields,
    previousExtendedFields: truncatedPreviousExtendedFields,
    truncatedFields,
  };
};
