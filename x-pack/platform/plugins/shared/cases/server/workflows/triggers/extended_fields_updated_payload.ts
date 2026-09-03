/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { diffExtendedFields } from '../../../common/utils/template_fields';
import type { ExtendedFieldsUpdatedPayload } from '../../../common/workflows/triggers';

/**
 * Builds the payload for the `cases.extendedFieldsUpdated` trigger.
 *
 * Returns `undefined` when nothing changed — the caller must not emit in that case.
 *
 * Only changed field keys are exposed; actual values are omitted so that users
 * without cases read access cannot observe case data through workflow triggers.
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
  const { changedFields } = diffExtendedFields(previousExtendedFields, extendedFields);

  if (changedFields.length === 0) {
    return undefined;
  }

  return {
    owner,
    caseId,
    changedFields,
  };
};
