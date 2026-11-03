/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';

export const CASES_OBSERVABLE_ID_NAMESPACE = 'bd323c37-d596-4e44-abbc-71fe3d9c34d5';

/**
 * Deterministic, 36-character document id for an observable: the same value added twice to the same
 * case in the same space maps to the same document, so create-only writes cannot produce duplicates.
 */
export const generateObservableDocumentId = ({
  spaceId,
  caseId,
  typeKey,
  value,
}: {
  spaceId: string;
  caseId: string;
  typeKey: string;
  value: string;
}): string =>
  uuidv5([spaceId, caseId, typeKey, value].join('\u0000'), CASES_OBSERVABLE_ID_NAMESPACE);
